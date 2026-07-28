/**
 * Auto-seed: inserts first week of batch data for a new user.
 * Called server-side when weekly_batches is empty.
 * Idempotent — safe to call multiple times.
 *
 * Schedule: week_start = Monday.
 *   sort_order 1  → TikTok    → Monday    (week_start + 0)  MePower™
 *   sort_order 2  → TikTok    → Tuesday   (week_start + 1)  Inner Power™
 *   sort_order 3  → TikTok    → Wednesday (week_start + 2)  MePower™
 *   sort_order 4  → TikTok    → Thursday  (week_start + 3)  Inner Power™
 *   sort_order 5  → TikTok    → Friday    (week_start + 4)  MindPower™
 *   sort_order 6  → TikTok    → Saturday  (week_start + 5)  DreamPower™
 *   sort_order 7  → TikTok    → Sunday    (week_start + 6)  Slaying Dragons™
 *   sort_order 8  → YouTube   → Wednesday (week_start + 2)  MePower™ flagship
 * Monday (week_start + 0) = Recording Day for NEXT week + posts TikTok #1.
 * Wednesday = TikTok #3 (sort 3) posts first, then YouTube flagship (sort 8).
 */

import { SupabaseClient } from "@supabase/supabase-js";

const TZ = process.env.USER_TIMEZONE || "Europe/London";

// Returns YYYY-MM-DD in the user's local timezone (en-CA locale returns that format natively)
function toLocalDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

// Returns the most recent Monday (or today if today is Monday) in user timezone
function getThisMonday(): string {
  const now = new Date();
  const todayStr = toLocalDate(now);
  // Build noon anchor so getDay() is unambiguous across DST boundaries
  const noon = new Date(todayStr + "T12:00:00");
  const dow = noon.getDay(); // 0=Sun..6=Sat
  const daysBack = (dow + 6) % 7; // 0 on Mon, ..., 6 on Sun
  noon.setDate(noon.getDate() - daysBack);
  return toLocalDate(noon);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export async function seedFirstWeek(
  supabase: SupabaseClient,
  userId: string
): Promise<{ seeded: boolean; error?: string }> {
  // Guard: skip if user already has batches
  const { count } = await supabase
    .from("weekly_batches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return { seeded: false };

  const monday = getThisMonday();

  // Insert weekly batch
  const { data: batch, error: batchErr } = await supabase
    .from("weekly_batches")
    .upsert(
      {
        user_id: userId,
        week_start: monday,
        theme: "Building Unshakeable Confidence in Your Child",
        youtube_title: "How to Raise a Confident Child: The Complete Somali Parenting Guide",
        youtube_notes: null,
        status: "planned",
        recording_completed: false,
      },
      { onConflict: "user_id,week_start" }
    )
    .select("id")
    .single();

  if (batchErr || !batch) return { seeded: false, error: batchErr?.message };

  // Clear any existing posts (idempotent)
  await supabase.from("batch_posts").delete().eq("batch_id", batch.id);

  const posts = [
    // sort_order 1 — TikTok — Monday (week_start + 0) — MePower™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 0),
      platform: "tiktok",
      title: "The One Word That Destroys Child Confidence",
      angle_notes: "PROGRAM: MePower™",
      sort_order: 1,
      status: "scheduled",
    },
    // sort_order 2 — TikTok — Tuesday (week_start + 1) — Inner Power™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 1),
      platform: "tiktok",
      title: "How to Build a Child Who Doesn't Need External Validation",
      angle_notes: "PROGRAM: Inner Power™",
      sort_order: 2,
      status: "scheduled",
    },
    // sort_order 3 — TikTok — Wednesday (week_start + 2) — MePower™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 2),
      platform: "tiktok",
      title: "Why Shy Children Need This — Not Encouragement",
      angle_notes: "PROGRAM: MePower™",
      sort_order: 3,
      status: "scheduled",
    },
    // sort_order 4 — TikTok — Thursday (week_start + 3) — Inner Power™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 3),
      platform: "tiktok",
      title: "The Discipline Mistake That Weakens Children",
      angle_notes: "PROGRAM: Inner Power™",
      sort_order: 4,
      status: "scheduled",
    },
    // sort_order 5 — TikTok — Friday (week_start + 4) — MindPower™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 4),
      platform: "tiktok",
      title: "How to Teach Your Child a Growth Mindset in 60 Seconds",
      angle_notes: "PROGRAM: MindPower™",
      sort_order: 5,
      status: "scheduled",
    },
    // sort_order 6 — TikTok — Saturday (week_start + 5) — DreamPower™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 5),
      platform: "tiktok",
      title: "Ask Your Child This Question Every Week",
      angle_notes: "PROGRAM: DreamPower™",
      sort_order: 6,
      status: "scheduled",
    },
    // sort_order 7 — TikTok — Sunday (week_start + 6) — Slaying Dragons™
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 6),
      platform: "tiktok",
      title: "How to Raise a Child Who Faces Fear Instead of Running",
      angle_notes: "PROGRAM: Slaying Dragons™",
      sort_order: 7,
      status: "scheduled",
    },
    // sort_order 8 — YouTube — Wednesday (week_start + 2) — MePower™ flagship
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(monday, 2),
      platform: "youtube",
      title: "How to Raise a Confident Child: The Complete Somali Parenting Guide",
      angle_notes: "PROGRAM: MePower™",
      sort_order: 8,
      status: "scheduled",
    },
  ];

  const { error: postsErr } = await supabase.from("batch_posts").insert(posts);

  if (postsErr) return { seeded: false, error: postsErr.message };

  return { seeded: true };
}
