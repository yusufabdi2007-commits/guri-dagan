-- ============================================================
-- TEST WEEK SEED DATA — Week of 2026-06-02
-- Guri Dagan — Scheduling + Calendar verification
--
-- BEFORE RUNNING:
--   1. Get your user UUID from Supabase Auth → Users
--   2. Replace 'YOUR_USER_ID_HERE' with your actual UUID
--   3. Run this entire file in Supabase SQL Editor
--
-- WHAT THIS CREATES:
--   1 YouTube post (Monday 2026-06-02)
--   7 TikTok posts (Mon–Sun 2026-06-02 to 2026-06-08)
--   All 5 programs represented with full scripts
--
-- PURPOSE:
--   Verify Calendar shows batch posts with program badges
--   Verify Today shows batch post for each day
--   Verify Sunday shows Recording Day mode
-- ============================================================

DO $$
DECLARE
  v_user_id  uuid := 'YOUR_USER_ID_HERE';  -- REPLACE THIS
  v_batch_id uuid;
BEGIN

-- ── Step 1: Create the weekly batch ──────────────────────────────────────────
INSERT INTO weekly_batches (
  user_id, week_start, theme, youtube_title, youtube_notes,
  status, recording_completed
)
VALUES (
  v_user_id,
  '2026-06-02',
  'Building Unshakeable Child Confidence',
  'How to Build Unshakeable Confidence in Your Child — Complete Parenting Guide',
  'Long-form YouTube video covering all 5 pillars of childhood confidence. Target: parents who feel their child is too shy or self-doubting.',
  'planned',
  false
)
ON CONFLICT (user_id, week_start)
DO UPDATE SET
  theme = EXCLUDED.theme,
  youtube_title = EXCLUDED.youtube_title,
  youtube_notes = EXCLUDED.youtube_notes
RETURNING id INTO v_batch_id;

-- ── Step 2: Delete old posts for this batch (idempotent re-run) ──────────────
DELETE FROM batch_posts WHERE batch_id = v_batch_id;

-- ── Step 3: Insert 8 posts ───────────────────────────────────────────────────

-- POST 1: YouTube — Monday — MePower™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-02',
  'youtube',
  'How to Build Unshakeable Confidence in Your Child — Complete Parenting Guide',
  E'PROGRAM: MePower™\n\nYouTube long-form: 5 confidence pillars for Somali parents\n\nHOOK [identity hook]: Are you accidentally destroying your child''s confidence without knowing it?\nPROBLEM: Most parents praise their children constantly but still see self-doubt growing. The issue isn''t what you say — it''s what your child believes about themselves.\nREFRAME: Confidence is not built through praise. It is built through small moments of genuine recognition — when you see your child, not just their results.\nTEACHING: The five pillars of unshakeable confidence are: being seen, being heard, being trusted, being challenged, and being celebrated for who they are — not what they achieve. Each pillar requires a different parenting response. You can learn all five and apply them this week.\nACTION: Tonight, ask your child: "What did you do today that you''re proud of?" — then just listen without adding anything.\nCTA: Follow for weekly parenting strategies that build children from the inside out.',
  0,
  'scheduled'
);

-- POST 2: TikTok — Monday — MePower™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-02',
  'tiktok',
  'The One Word That Destroys Child Confidence',
  E'PROGRAM: MePower™\n\nHOOK [shock hook]: This one word — said with love — is destroying your child''s confidence.\nPROBLEM: Parents say "but" after every compliment. "You did well, BUT next time...". The child only hears the BUT.\nREFRAME: Your child''s brain deletes everything before BUT. It only remembers the criticism.\nTEACHING: Replace BUT with AND. "You did well, AND next time try this." One word. Total shift in how your child receives feedback.\nACTION: For the next 3 days, catch every BUT and replace it with AND.\nCTA: Follow — I share small changes that build confident children.',
  1,
  'scheduled'
);

-- POST 3: TikTok — Tuesday — Inner Power™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-03',
  'tiktok',
  'How to Build a Child Who Doesn''t Need External Validation',
  E'PROGRAM: Inner Power™\n\nHOOK [question hook]: What happens to your child when no one is watching — do they still do the right thing?\nPROBLEM: Children who only behave for praise collapse when alone. They have no internal compass.\nREFRAME: True character is what your child does when no one is watching. That is what Inner Power means.\nTEACHING: Build internal values by asking "What do YOU think about what you did?" instead of "I''m proud of you." This trains children to self-evaluate rather than seek your approval.\nACTION: This week, ask your child to judge their own behaviour before you give your opinion.\nCTA: Follow for Somali parenting wisdom that builds children from the inside.',
  2,
  'scheduled'
);

-- POST 4: TikTok — Wednesday — MePower™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-04',
  'tiktok',
  'Why Shy Children Need THIS Not Encouragement',
  E'PROGRAM: MePower™\n\nHOOK [contrast hook]: Stop encouraging your shy child. Do this instead.\nPROBLEM: Encouragement like "you can do it!" makes shy children feel more pressure, not less. It signals you think they need help.\nREFRAME: Shy children don''t need encouragement. They need safety. Create safety first — confidence follows.\nTEACHING: Instead of pushing, stand next to them. Instead of speaking for them, wait. Instead of reassuring, just be present. Presence communicates safety without pressure.\nACTION: Next time your child hesitates socially, stand beside them quietly and wait.\nCTA: Follow for daily parenting strategies for Somali families.',
  3,
  'scheduled'
);

-- POST 5: TikTok — Thursday — Inner Power™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-05',
  'tiktok',
  'The Discipline Mistake That Weakens Children',
  E'PROGRAM: Inner Power™\n\nHOOK [story hook]: I watched a parent yell at their child for lying — and accidentally teach them to lie better.\nPROBLEM: Punishment-based discipline teaches children to avoid getting caught, not to value honesty.\nREFRAME: Children who have strong values aren''t afraid of punishment. They have an internal reason not to lie.\nTEACHING: Build value-based discipline by asking "What do we believe in our family?" when boundaries are crossed. Connect behaviour to identity, not consequences.\nACTION: This week, say to your child: "In our family, we tell the truth even when it''s hard."\nCTA: Follow for parenting that builds children with unshakeable character.',
  4,
  'scheduled'
);

-- POST 6: TikTok — Friday — MindPower™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-06',
  'tiktok',
  'How to Teach Your Child a Growth Mindset in 60 Seconds',
  E'PROGRAM: MindPower™\n\nHOOK [question hook]: Does your child say "I can''t do this"? Here''s the exact response that changes their brain.\nPROBLEM: When children say "I can''t", parents either agree or over-reassure. Both responses leave the mindset unchanged.\nREFRAME: The word YET is the most powerful word in parenting. "I can''t do this" becomes "I can''t do this YET."\nTEACHING: Growth mindset isn''t about positive thinking. It''s about believing ability is built through effort. When you add YET, you signal to your child''s brain: this is learnable. That single word rewires how they approach challenges.\nACTION: Every time your child says "I can''t" this week — add YET out loud.\nCTA: Follow for practical parenting tools that work immediately.',
  5,
  'scheduled'
);

-- POST 7: TikTok — Saturday — DreamPower™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-07',
  'tiktok',
  'Ask Your Child This Question Every Week',
  E'PROGRAM: DreamPower™\n\nHOOK [identity hook]: The parents raising vision-driven children ask this one question every week.\nPROBLEM: Most children have no vision for their future. They react to life instead of creating it.\nREFRAME: A child with a dream is a child with direction. Dreams are not childish — they are the GPS of a meaningful life.\nTEACHING: Ask your child every week: "If you could do anything and you knew you could not fail, what would you do?" Do not judge the answer. Write it down. Revisit it. Let the dream grow with them.\nACTION: Ask this question tonight at dinner or bedtime.\nCTA: Follow — helping Somali parents raise children who dream big and act bigger.',
  6,
  'scheduled'
);

-- POST 8: TikTok — Sunday — Slaying Dragons™
INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
VALUES (
  v_batch_id, v_user_id,
  '2026-06-08',
  'tiktok',
  'How to Raise a Child Who Faces Fear Instead of Running',
  E'PROGRAM: Slaying Dragons™\n\nHOOK [contrast hook]: Brave children are not born — they are made by how their parents respond to fear.\nPROBLEM: When children are scared, most parents say "don''t worry" or "there''s nothing to be scared of." This invalidates the fear and leaves the child alone with it.\nREFRAME: Fear is not the enemy. Avoiding fear is. Brave children learn that fear is information — not a stop sign.\nTEACHING: When your child is afraid, say: "I see that you''re scared. That makes sense. Let''s figure out what we can do together." Then take one tiny step into the fear — together. This teaches them fear is survivable.\nACTION: Find one small thing your child fears this week and walk through it with them — one step.\nCTA: Follow for weekly parenting strategies that build emotionally strong children.',
  7,
  'scheduled'
);

RAISE NOTICE 'Test week created successfully. Batch ID: %', v_batch_id;
RAISE NOTICE 'Created 8 posts for week 2026-06-02 through 2026-06-08';
RAISE NOTICE 'Programs: MePower x2, Inner Power x2, MindPower x1, DreamPower x1, Slaying Dragons x1 + YouTube (MePower)';

END $$;

-- ── Verification Query ────────────────────────────────────────────────────────
-- Run this after the seed to confirm everything was created:

SELECT
  b.week_start,
  b.theme,
  COUNT(p.id) AS post_count,
  STRING_AGG(p.platform || ':' || p.scheduled_date, ', ' ORDER BY p.sort_order) AS schedule
FROM weekly_batches b
LEFT JOIN batch_posts p ON p.batch_id = b.id
WHERE b.week_start = '2026-06-02'
GROUP BY b.id, b.week_start, b.theme;
