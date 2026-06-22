import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TZ = process.env.USER_TIMEZONE || "Europe/London";

function toLocalDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

function getWeekStart(todayStr: string): string {
  const noon = new Date(todayStr + "T12:00:00");
  const dow = noon.getDay();
  const daysBack = (dow + 6) % 7;
  noon.setDate(noon.getDate() - daysBack);
  return toLocalDate(noon);
}

// ─── GET — list recent backups ──────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("weekly_backups")
    .select("id, week_start, label, post_count, created_at, restored_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// ─── POST — create or restore ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  const action = (body.action as string) || "create";
  const todayStr = toLocalDate(new Date());
  const weekStart = getWeekStart(todayStr);

  // ─── CREATE BACKUP ──────────────────────────────────────────────────────────
  if (action === "create") {
    const targetWeek = (body.week_start as string) || weekStart;

    // Validate target week is a Monday
    const dow = new Date(targetWeek + "T12:00:00").getDay();
    if (dow !== 1) {
      return NextResponse.json({ error: "week_start must be a Monday (YYYY-MM-DD)" }, { status: 400 });
    }

    const label =
      (body.label as string) ||
      `Snapshot — ${new Date().toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;

    const { data: batch } = await supabase
      .from("weekly_batches").select("*").eq("user_id", user.id).eq("week_start", targetWeek).maybeSingle();
    if (!batch) return NextResponse.json({ error: `No batch found for week starting ${targetWeek}` }, { status: 404 });

    const weekEnd = addDays(targetWeek, 6);
    const { data: posts } = await supabase
      .from("batch_posts").select("*").eq("user_id", user.id)
      .gte("scheduled_date", targetWeek).lte("scheduled_date", weekEnd);

    const { data: backup, error } = await supabase
      .from("weekly_backups")
      .insert({
        user_id: user.id,
        week_start: targetWeek,
        label,
        batch_data: batch,
        posts_data: posts || [],
        post_count: (posts || []).length,
      })
      .select("id, week_start, label, post_count, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ backup, message: `Backup created — ${(posts || []).length} posts captured for ${targetWeek}` }, { status: 201 });
  }

  // ─── RESTORE BACKUP ─────────────────────────────────────────────────────────
  if (action === "restore") {
    const backupId = body.backup_id as string;
    if (!backupId) return NextResponse.json({ error: "backup_id is required" }, { status: 400 });

    const { data: backup } = await supabase
      .from("weekly_backups").select("*").eq("id", backupId).eq("user_id", user.id).single();
    if (!backup) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

    const batchData = backup.batch_data as Record<string, unknown>;
    const postsData = (backup.posts_data as Record<string, unknown>[]) || [];

    // Find current batch for that week
    const { data: currentBatch } = await supabase
      .from("weekly_batches").select("id").eq("user_id", user.id).eq("week_start", backup.week_start).maybeSingle();

    let targetBatchId: string;

    if (currentBatch) {
      // Delete all existing posts for this batch
      await supabase.from("batch_posts").delete().eq("user_id", user.id).eq("batch_id", currentBatch.id);

      // Restore batch fields (excluding id, user_id, created_at)
      await supabase.from("weekly_batches").update({
        theme: batchData.theme ?? null,
        status: batchData.status ?? "planning",
        youtube_title: batchData.youtube_title ?? null,
        youtube_notes: batchData.youtube_notes ?? null,
        tiktok_angles: batchData.tiktok_angles ?? null,
        recording_completed: batchData.recording_completed ?? false,
        updated_at: new Date().toISOString(),
      }).eq("id", currentBatch.id);

      targetBatchId = currentBatch.id;
    } else {
      // Batch was deleted — recreate it
      const { data: newBatch, error: batchErr } = await supabase
        .from("weekly_batches")
        .insert({
          user_id: user.id,
          week_start: backup.week_start,
          theme: batchData.theme ?? null,
          status: batchData.status ?? "planning",
          youtube_title: batchData.youtube_title ?? null,
          youtube_notes: batchData.youtube_notes ?? null,
          tiktok_angles: batchData.tiktok_angles ?? null,
          recording_completed: batchData.recording_completed ?? false,
        })
        .select("id")
        .single();

      if (batchErr || !newBatch) return NextResponse.json({ error: `Failed to recreate batch: ${batchErr?.message}` }, { status: 500 });
      targetBatchId = newBatch.id;
    }

    // Re-insert posts (strip id so DB generates fresh UUIDs)
    if (postsData.length > 0) {
      const restoredPosts = postsData.map(p => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...rest } = p as Record<string, unknown>;
        return { ...rest, batch_id: targetBatchId, user_id: user.id };
      });
      const { error: insertErr } = await supabase.from("batch_posts").insert(restoredPosts);
      if (insertErr) return NextResponse.json({ error: `Posts restored but insert failed: ${insertErr.message}` }, { status: 500 });
    }

    // Mark backup as restored
    await supabase.from("weekly_backups").update({ restored_at: new Date().toISOString() }).eq("id", backupId);

    return NextResponse.json({
      message: `Restored ${postsData.length} posts from backup "${backup.label}" (${backup.week_start})`,
      restored: postsData.length,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
