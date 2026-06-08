/**
 * Auto-seed: inserts first week of batch data for a new user.
 * Called server-side when weekly_batches is empty.
 * Idempotent — safe to call multiple times.
 *
 * Schedule: week_start = Sunday.
 *   sort_order 0  → YouTube   → Sunday (week_start + 0)
 *   sort_order 1  → TikTok    → Tuesday (week_start + 2)
 *   sort_order 2  → TikTok    → Wednesday (week_start + 3)
 *   sort_order 3  → TikTok    → Thursday (week_start + 4)
 *   sort_order 4  → TikTok    → Friday (week_start + 5)
 *   sort_order 5  → TikTok    → Saturday (week_start + 6)
 *   sort_order 6  → TikTok    → Sunday (week_start + 0) ← same day as YouTube
 *   sort_order 7  → TikTok    → Sunday (week_start + 0) ← same day as YouTube
 * Monday (week_start + 1) = Recording Day — no posts scheduled.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// Returns the most recent Sunday (or today if today is Sunday)
function getThisSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // getDay()=0 → stays; 1-6 → goes back
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
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

  const sunday = getThisSunday();

  // Insert weekly batch
  const { data: batch, error: batchErr } = await supabase
    .from("weekly_batches")
    .upsert(
      {
        user_id: userId,
        week_start: sunday,
        theme: "Building Unshakeable Confidence in Your Child",
        youtube_title: "How to Raise a Confident Child: The Complete Somali Parenting Guide",
        youtube_notes:
          "Long-form guide covering the 5 pillars of childhood confidence. Target: Somali parents who see self-doubt growing in their child despite constant praise.",
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
    // sort_order 0 — YouTube — Sunday
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 0),
      platform: "youtube",
      title: "How to Raise a Confident Child: The Complete Somali Parenting Guide",
      angle_notes:
        "PROGRAM: MePower™\n\nYouTube long-form: 5 confidence pillars for Somali parents\n\nHOOK [identity hook]: Are you accidentally destroying your child's confidence without knowing it?\nPROBLEM: Most parents praise their children constantly but still see self-doubt growing. The issue isn't what you say — it's what your child believes about themselves.\nREFRAME: Confidence is not built through praise. It is built through small moments of genuine recognition — when you see your child, not just their results.\nTEACHING: The five pillars of unshakeable confidence: being seen, heard, trusted, challenged, and celebrated for who they are — not what they achieve. Each pillar needs a different parenting response.\nACTION: Tonight, ask your child: \"What did you do today that you're proud of?\" then just listen without adding anything.\nCTA: Follow for weekly parenting strategies that build children from the inside out.",
      sort_order: 0,
      status: "scheduled",
    },
    // sort_order 1 — TikTok — Tuesday
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 2),
      platform: "tiktok",
      title: "The One Word That Destroys Child Confidence",
      angle_notes:
        "PROGRAM: MePower™\n\nHOOK [shock hook]: This one word — said with love — is destroying your child's confidence.\nPROBLEM: Parents say \"but\" after every compliment. \"You did well, BUT next time...\" The child only hears the BUT.\nREFRAME: Your child's brain deletes everything before BUT. It only remembers the criticism.\nTEACHING: Replace BUT with AND. \"You did well, AND next time try this.\" One word changes everything.\nACTION: For the next 3 days, catch every BUT and replace it with AND.\nCTA: Follow — I share small changes that build confident children.",
      sort_order: 1,
      status: "scheduled",
    },
    // sort_order 2 — TikTok — Wednesday
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 3),
      platform: "tiktok",
      title: "How to Build a Child Who Doesn't Need External Validation",
      angle_notes:
        "PROGRAM: Inner Power™\n\nHOOK [question hook]: What does your child do when no one is watching — do they still do the right thing?\nPROBLEM: Children who only behave for praise collapse when alone. They have no internal compass.\nREFRAME: True character is what your child does when no one is watching. That is what Inner Power means.\nTEACHING: Build internal values by asking \"What do YOU think about what you did?\" instead of \"I'm proud of you.\" This trains self-evaluation over approval-seeking.\nACTION: This week, ask your child to judge their own behaviour before you give your opinion.\nCTA: Follow for Somali parenting wisdom that builds children from the inside.",
      sort_order: 2,
      status: "scheduled",
    },
    // sort_order 3 — TikTok — Thursday
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 4),
      platform: "tiktok",
      title: "Why Shy Children Need This — Not Encouragement",
      angle_notes:
        "PROGRAM: MePower™\n\nHOOK [contrast hook]: Stop encouraging your shy child. Do this instead.\nPROBLEM: Encouragement like \"you can do it!\" creates more pressure. It signals you think they need help.\nREFRAME: Shy children don't need encouragement. They need safety. Create safety first — confidence follows.\nTEACHING: Instead of pushing, stand next to them. Instead of speaking for them, wait. Presence communicates safety without pressure.\nACTION: Next time your child hesitates socially, stand beside them quietly and wait.\nCTA: Follow for daily parenting strategies for Somali families.",
      sort_order: 3,
      status: "scheduled",
    },
    // sort_order 4 — TikTok — Friday
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 5),
      platform: "tiktok",
      title: "The Discipline Mistake That Weakens Children",
      angle_notes:
        "PROGRAM: Inner Power™\n\nHOOK [story hook]: I watched a parent punish their child for lying — and accidentally teach them to lie better.\nPROBLEM: Punishment-based discipline teaches children to avoid getting caught, not to value honesty.\nREFRAME: Children with strong values aren't afraid of punishment — they have an internal reason to be honest.\nTEACHING: Build value-based discipline by saying \"What do we believe in our family?\" when boundaries are crossed. Connect behaviour to identity, not consequences.\nACTION: This week, say to your child: \"In our family, we tell the truth even when it's hard.\"\nCTA: Follow for parenting that builds children with unshakeable character.",
      sort_order: 4,
      status: "scheduled",
    },
    // sort_order 5 — TikTok — Saturday
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 6),
      platform: "tiktok",
      title: "How to Teach Your Child a Growth Mindset in 60 Seconds",
      angle_notes:
        "PROGRAM: MindPower™\n\nHOOK [question hook]: Does your child say \"I can't do this\"? Here's the exact response that rewires their brain.\nPROBLEM: When children say \"I can't\", parents either agree or over-reassure. Both leave the mindset unchanged.\nREFRAME: The word YET is the most powerful word in parenting. \"I can't do this\" becomes \"I can't do this YET.\"\nTEACHING: Growth mindset is not positive thinking. It's believing ability is built through effort. YET signals to the brain: this is learnable.\nACTION: Every time your child says \"I can't\" this week — add YET out loud.\nCTA: Follow for practical parenting tools that work immediately.",
      sort_order: 5,
      status: "scheduled",
    },
    // sort_order 6 — TikTok — Sunday (same day as YouTube)
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 0),
      platform: "tiktok",
      title: "Ask Your Child This Question Every Week",
      angle_notes:
        "PROGRAM: DreamPower™\n\nHOOK [identity hook]: The parents raising vision-driven children ask this one question every week.\nPROBLEM: Most children have no vision for their future. They react to life instead of creating it.\nREFRAME: A child with a dream is a child with direction. Dreams are not childish — they are the GPS of a meaningful life.\nTEACHING: Ask your child every week: \"If you could do anything and knew you could not fail, what would you do?\" Don't judge the answer. Write it down. Let the dream grow.\nACTION: Ask this question tonight at dinner or bedtime.\nCTA: Follow — helping Somali parents raise children who dream big and act bigger.",
      sort_order: 6,
      status: "scheduled",
    },
    // sort_order 7 — TikTok — Sunday (same day as YouTube)
    {
      batch_id: batch.id,
      user_id: userId,
      scheduled_date: addDays(sunday, 0),
      platform: "tiktok",
      title: "How to Raise a Child Who Faces Fear Instead of Running",
      angle_notes:
        "PROGRAM: Slaying Dragons™\n\nHOOK [contrast hook]: Brave children are not born — they are made by how their parents respond to fear.\nPROBLEM: When children are scared, most parents say \"don't worry\" or \"there's nothing to be scared of.\" This leaves the child alone with the fear.\nREFRAME: Fear is not the enemy. Avoiding fear is. Brave children learn that fear is information — not a stop sign.\nTEACHING: When your child is afraid, say: \"I see you're scared. That makes sense. Let's figure out what we can do together.\" Then take one tiny step into the fear — together.\nACTION: Find one small thing your child fears this week and walk through it with them — one step.\nCTA: Follow for weekly parenting strategies that build emotionally strong children.",
      sort_order: 7,
      status: "scheduled",
    },
  ];

  const { error: postsErr } = await supabase.from("batch_posts").insert(posts);

  if (postsErr) return { seeded: false, error: postsErr.message };

  return { seeded: true };
}
