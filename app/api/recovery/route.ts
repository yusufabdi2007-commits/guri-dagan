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

const YOUTUBE_DAY_OFFSET = 2; // Wednesday
const ALL_PROGRAMS = ["MePower™", "Inner Power™", "MindPower™", "DreamPower™", "Slaying Dragons™"];

export interface RecoveryResult {
  action: string;
  message: string;
  changed: number;
  details?: unknown;
  error?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = body.action as string;
  if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

  const todayStr = toLocalDate(new Date());
  const weekStart = getWeekStart(todayStr);
  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ─── FIX SORT ORDER ─────────────────────────────────────────────────────────
  if (action === "fix_sort_order") {
    const { data: batch } = await supabase
      .from("weekly_batches").select("id").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle();
    if (!batch) return NextResponse.json<RecoveryResult>({ action, message: "No batch this week — nothing to fix", changed: 0 });

    const { data: posts } = await supabase
      .from("batch_posts").select("id, platform, scheduled_date, sort_order")
      .eq("user_id", user.id).eq("batch_id", batch.id);
    if (!posts || posts.length === 0) return NextResponse.json<RecoveryResult>({ action, message: "No posts found", changed: 0 });

    let changed = 0;
    for (const p of posts) {
      if (p.sort_order != null) continue;
      const dateOffset = weekDates.indexOf(p.scheduled_date);
      const sortOrder = p.platform === "YouTube" ? 8 : (dateOffset >= 0 ? dateOffset + 1 : 99);
      await supabase.from("batch_posts").update({ sort_order: sortOrder }).eq("id", p.id);
      changed++;
    }
    return NextResponse.json<RecoveryResult>({ action, message: changed > 0 ? `Fixed sort_order on ${changed} post(s)` : "No issues found — all sort_orders are already set", changed });
  }

  // ─── FIX WEEK DATES ─────────────────────────────────────────────────────────
  if (action === "fix_week_dates") {
    const { data: batch } = await supabase
      .from("weekly_batches").select("id, week_start").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle();
    if (!batch) return NextResponse.json<RecoveryResult>({ action, message: "No batch for this week", changed: 0 });

    const { data: posts } = await supabase
      .from("batch_posts").select("id, platform, sort_order, scheduled_date")
      .eq("user_id", user.id).eq("batch_id", batch.id);
    if (!posts || posts.length === 0) return NextResponse.json<RecoveryResult>({ action, message: "No posts found", changed: 0 });

    let changed = 0;
    for (const p of posts) {
      let expectedDate: string;
      if (p.platform === "YouTube") {
        expectedDate = addDays(batch.week_start, YOUTUBE_DAY_OFFSET);
      } else {
        // TikTok sort_order 1–7 → day offset 0–6
        const dayOffset = p.sort_order != null ? Math.max(0, Math.min(p.sort_order - 1, 6)) : 0;
        expectedDate = addDays(batch.week_start, dayOffset);
      }
      if (p.scheduled_date !== expectedDate) {
        await supabase.from("batch_posts").update({ scheduled_date: expectedDate }).eq("id", p.id);
        changed++;
      }
    }
    return NextResponse.json<RecoveryResult>({ action, message: changed > 0 ? `Fixed scheduled_date on ${changed} post(s)` : "All dates already correct", changed });
  }

  // ─── DETECT DUPLICATES ──────────────────────────────────────────────────────
  if (action === "detect_duplicates") {
    const { data: posts } = await supabase
      .from("batch_posts").select("id, platform, scheduled_date, title, status")
      .eq("user_id", user.id).gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd);
    if (!posts) return NextResponse.json<RecoveryResult>({ action, message: "No posts found", changed: 0 });

    const groups: Record<string, typeof posts> = {};
    for (const p of posts) {
      const key = `${p.platform} on ${p.scheduled_date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    const duplicates = Object.entries(groups)
      .filter(([, v]) => v.length > 1)
      .map(([key, v]) => ({ slot: key, count: v.length, posts: v.map(p => ({ id: p.id, title: p.title, status: p.status })) }));

    if (duplicates.length === 0) {
      return NextResponse.json<RecoveryResult>({ action, message: "No duplicate posts found", changed: 0, details: { duplicates: [] } });
    }
    return NextResponse.json<RecoveryResult>({ action, message: `Found ${duplicates.length} duplicate slot(s) — review and delete extras manually`, changed: 0, details: { duplicates } });
  }

  // ─── REPAIR MISSING POSTS ───────────────────────────────────────────────────
  if (action === "repair_missing_posts") {
    const { data: batch } = await supabase
      .from("weekly_batches").select("id, week_start").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle();
    if (!batch) return NextResponse.json<RecoveryResult>({ action, message: "No batch for this week — create one at /batch/plan first", changed: 0 });

    const { data: existing } = await supabase
      .from("batch_posts").select("platform, sort_order, scheduled_date")
      .eq("user_id", user.id).eq("batch_id", batch.id);
    const existingKeys = new Set((existing || []).map(p => `${p.platform}::${p.sort_order}`));

    const toInsert: object[] = [];
    for (let i = 0; i < 7; i++) {
      if (!existingKeys.has(`TikTok::${i + 1}`)) {
        toInsert.push({
          user_id: user.id, batch_id: batch.id, platform: "TikTok",
          sort_order: i + 1, scheduled_date: addDays(batch.week_start, i),
          status: "pending", title: `TikTok #${i + 1}`, angle_notes: "",
        });
      }
    }
    if (!existingKeys.has("YouTube::8")) {
      toInsert.push({
        user_id: user.id, batch_id: batch.id, platform: "YouTube",
        sort_order: 8, scheduled_date: addDays(batch.week_start, YOUTUBE_DAY_OFFSET),
        status: "pending", title: "YouTube Video", angle_notes: "",
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json<RecoveryResult>({ action, message: "No missing posts — batch already has all 8 slots", changed: 0 });
    }
    const { error } = await supabase.from("batch_posts").insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json<RecoveryResult>({ action, message: `Created ${toInsert.length} missing post slot(s) (blank placeholders)`, changed: toInsert.length });
  }

  // ─── RECALCULATE PROGRESS ───────────────────────────────────────────────────
  if (action === "recalculate_progress") {
    const { data: posts } = await supabase
      .from("batch_posts").select("id, status, platform, scheduled_date")
      .eq("user_id", user.id).gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd);
    const posted = (posts || []).filter(p => p.status === "posted").length;
    const total = (posts || []).length;

    const { data: completions } = await supabase
      .from("daily_completions").select("id, completed_date, platform")
      .eq("user_id", user.id).gte("completed_date", weekStart).lte("completed_date", weekEnd);

    return NextResponse.json<RecoveryResult>({
      action,
      message: `${posted}/${total} batch_posts are posted; ${(completions || []).length} daily_completion records exist this week`,
      changed: 0,
      details: { posted, total, completions: (completions || []).length },
    });
  }

  // ─── REPAIR HISTORY ─────────────────────────────────────────────────────────
  if (action === "repair_history") {
    const { data: postedPosts } = await supabase
      .from("batch_posts").select("scheduled_date, platform")
      .eq("user_id", user.id).eq("status", "posted")
      .gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd);

    const { data: completions } = await supabase
      .from("daily_completions").select("completed_date, platform")
      .eq("user_id", user.id).gte("completed_date", weekStart).lte("completed_date", weekEnd);

    const existingKeys = new Set((completions || []).map(c => `${c.completed_date}::${c.platform}`));
    const toAdd = (postedPosts || []).filter(p => !existingKeys.has(`${p.scheduled_date}::${p.platform}`));

    let changed = 0;
    for (const p of toAdd) {
      const { error } = await supabase.from("daily_completions").upsert(
        { user_id: user.id, completed_date: p.scheduled_date, platform: p.platform },
        { onConflict: "user_id,completed_date,platform" }
      );
      if (!error) changed++;
    }
    return NextResponse.json<RecoveryResult>({
      action,
      message: changed > 0 ? `Added ${changed} missing completion record(s) to match posted batch_posts` : "No missing history records — history is consistent",
      changed,
    });
  }

  // ─── VALIDATE PROGRAM KNOWLEDGE ─────────────────────────────────────────────
  if (action === "validate_program_knowledge") {
    const { data: items } = await supabase
      .from("program_knowledge").select("program_name, char_count, file_name, indexed_at")
      .eq("user_id", user.id);

    const found = new Map((items || []).map(i => [i.program_name, i]));
    const missing = ALL_PROGRAMS.filter(p => !found.has(p));
    const issues = (items || []).filter(i => i.char_count < 500).map(i => `${i.program_name}: only ${i.char_count} chars — likely poor extraction`);

    const status = missing.length === 0 && issues.length === 0 ? "healthy" : "warning";
    return NextResponse.json<RecoveryResult>({
      action,
      message: status === "healthy"
        ? "All 5 programs have curriculum uploaded and meet quality threshold"
        : `${found.size}/5 programs present${missing.length > 0 ? `; missing: ${missing.join(", ")}` : ""}${issues.length > 0 ? `; ${issues.length} quality issue(s)` : ""}`,
      changed: 0,
      details: { present: [...found.keys()], missing, qualityIssues: issues },
    });
  }

  // ─── VALIDATE WEEKLY BATCHES ────────────────────────────────────────────────
  if (action === "validate_batches") {
    const { data: batches } = await supabase
      .from("weekly_batches").select("id, week_start, status, theme")
      .eq("user_id", user.id)
      .gte("week_start", addDays(weekStart, -28))
      .order("week_start", { ascending: false });

    const issues: string[] = [];
    for (const b of (batches || [])) {
      const dow = new Date(b.week_start + "T12:00:00").getDay();
      if (dow !== 1) issues.push(`Batch ${b.week_start} has week_start on a ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow]}, not Monday`);
    }
    return NextResponse.json<RecoveryResult>({
      action,
      message: issues.length === 0
        ? `All ${(batches || []).length} recent batches are valid`
        : `${issues.length} batch integrity issue(s) found`,
      changed: 0,
      details: { batches: batches?.length || 0, issues },
    });
  }

  // ─── REBUILD TOMORROW PREVIEW ───────────────────────────────────────────────
  if (action === "rebuild_tomorrow") {
    const tomorrowStr = addDays(todayStr, 1);
    const { data: post } = await supabase
      .from("batch_posts").select("id, platform, title, scheduled_date, status")
      .eq("user_id", user.id).eq("scheduled_date", tomorrowStr)
      .order("sort_order", { ascending: true }).limit(1).maybeSingle();

    if (!post) {
      return NextResponse.json<RecoveryResult>({ action, message: `No post found for tomorrow (${tomorrowStr}) — this may be end of week or a planning gap`, changed: 0 });
    }
    return NextResponse.json<RecoveryResult>({
      action,
      message: `Tomorrow (${tomorrowStr}): ${post.platform} — "${post.title || "untitled"}" (${post.status})`,
      changed: 0,
      details: { tomorrowPost: post },
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
