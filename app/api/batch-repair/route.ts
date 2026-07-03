import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Fixed program order — matches batch-plan/route.ts
const TIKTOK_PROGRAM_ORDER = [
  "MePower™",         // Mon
  "Inner Power™",     // Tue
  "MePower™",         // Wed
  "Inner Power™",     // Thu
  "MindPower™",       // Fri
  "DreamPower™",      // Sat
  "Slaying Dragons™", // Sun
] as const;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// POST /api/batch-repair
// Body: { weekStart: "YYYY-MM-DD" }
// Creates any missing batch_posts for the week's batch.
// Only creates posts that don't already exist (by sort_order).
// Never touches posts that are already posted.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const { weekStart } = body;
  if (!weekStart || typeof weekStart !== "string") {
    return NextResponse.json({ error: "weekStart is required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Find the batch
  const { data: batch, error: batchErr } = await supabase
    .from("weekly_batches")
    .select("id, theme, youtube_title, week_start")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 });
  if (!batch) return NextResponse.json({ error: `No batch found for week starting ${weekStart}` }, { status: 404 });

  // Fetch existing posts
  const { data: existingPosts } = await supabase
    .from("batch_posts")
    .select("sort_order, status, platform")
    .eq("batch_id", batch.id);

  const existingSortOrders = new Set((existingPosts || []).map(p => p.sort_order));

  const theme = batch.theme || "this week's theme";
  const themeCapital = theme.charAt(0).toUpperCase() + theme.slice(1);
  const ytDate = addDays(weekStart, 2); // YouTube = Wednesday

  // Build all 8 expected posts
  const allPosts = [
    // YouTube — sort_order 8, Wednesday
    {
      sort_order: 8,
      batch_id: batch.id,
      user_id: user.id,
      scheduled_date: ytDate,
      platform: "youtube" as const,
      title: batch.youtube_title || `${themeCapital} — MePower™ YouTube`,
      angle_notes: `PROGRAM: MePower™\n\nYouTube Long-form\n\nHOOK [value hook]: ${themeCapital} is something every parent needs to understand.\nPROBLEM: Without the right approach, children struggle with ${theme} long-term.\nREFRAME: Next time your child struggles with ${theme}, try this one thing: "What's one small step you can try right now?"\nTEACHING: That tip helps in the moment, but MePower™ works through the full system.\nCLOSE: If this resonates, MePower™ was built for exactly this.\nCTA: Book a free call from the link in bio.`,
      sort_order_val: 8,
      status: "scheduled",
    },
    // 7 TikToks: Mon–Sun
    ...TIKTOK_PROGRAM_ORDER.map((program, i) => ({
      sort_order: i + 1,
      batch_id: batch.id,
      user_id: user.id,
      scheduled_date: addDays(weekStart, i),
      platform: "tiktok" as const,
      title: `${themeCapital} — ${program} (${DAY_NAMES[i]})`,
      angle_notes: `PROGRAM: ${program}\n\nHOOK [value hook]: ${themeCapital} is something every parent faces.\nPROBLEM: Without support, children struggle silently with ${theme}.\nREFRAME: Try this with your child today around ${theme}: one small brave step changes everything.\nTEACHING: That's one technique. ${program} goes deeper with the full system.\nCLOSE: ${program} was built for this.\nCTA: DM me "${program.replace("™", "").replace(/ /g, "").toUpperCase()}" to learn more.`,
      status: "scheduled",
    })),
  ];

  // Only insert posts with missing sort_orders
  const toInsert = allPosts
    .filter(p => !existingSortOrders.has(p.sort_order))
    .map(({ sort_order_val: _, ...rest }) => rest); // remove helper field

  if (toInsert.length === 0) {
    return NextResponse.json({ message: "All 8 posts already exist — nothing to repair.", repaired: 0 });
  }

  const { error: insertErr } = await supabase.from("batch_posts").insert(toInsert);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({
    message: `Repaired ${toInsert.length} missing post${toInsert.length === 1 ? "" : "s"}.`,
    repaired: toInsert.length,
    weekStart,
  });
}
