-- ============================================================
-- BOOTSTRAP FIRST WEEK — Guri Dagan
-- Dynamic: calculates next Monday from today automatically.
--
-- BEFORE RUNNING:
--   1. Get your user UUID: Supabase → Authentication → Users
--   2. Replace 'YOUR_USER_ID_HERE' below with your UUID
--   3. Run this entire file in Supabase SQL Editor
--
-- WHAT THIS CREATES:
--   1 weekly_batches record for the upcoming Monday
--   1 YouTube post (Monday)
--   7 TikTok posts (Mon–Sun)
--   All 5 programs: MePower×2, Inner Power×2, MindPower×1,
--                   DreamPower×1, Slaying Dragons×1
--
-- PURPOSE:
--   Bootstrap the scheduling system with real content so
--   /today, /calendar, and /batch all have data to render.
--   Safe to re-run: uses ON CONFLICT + DELETE to reset data.
-- ============================================================

DO $$
DECLARE
  v_user_id   uuid   := 'YOUR_USER_ID_HERE';   -- REPLACE THIS
  v_monday    date;
  v_batch_id  uuid;
  v_count     integer;
BEGIN

  -- ── Guard: only run if user has zero weekly batches ───────────────────────
  SELECT COUNT(*) INTO v_count FROM weekly_batches WHERE user_id = v_user_id;
  IF v_count > 0 THEN
    RAISE NOTICE 'User already has % weekly batch(es) — bootstrap skipped. Delete existing batches first if you want to re-seed.', v_count;
    RETURN;
  END IF;

  -- ── Calculate next Monday from today ──────────────────────────────────────
  -- If today IS Monday, use today. Otherwise advance to next Monday.
  v_monday := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::date;
  -- DATE_TRUNC('week') returns Monday. Adding 1 day ensures we always get
  -- the UPCOMING Monday even if today is Sunday.

  RAISE NOTICE 'Bootstrapping week starting: %', v_monday;

  -- ── Step 1: Create the weekly batch ──────────────────────────────────────
  INSERT INTO weekly_batches (
    user_id, week_start, theme, youtube_title, youtube_notes, status, recording_completed
  )
  VALUES (
    v_user_id,
    v_monday,
    'Building Unshakeable Confidence in Your Child',
    'How to Raise a Confident Child: The Complete Somali Parenting Guide',
    'Long-form guide covering the 5 pillars of childhood confidence. Target: Somali parents who see self-doubt growing in their child despite constant praise.',
    'planned',
    false
  )
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    theme          = EXCLUDED.theme,
    youtube_title  = EXCLUDED.youtube_title,
    youtube_notes  = EXCLUDED.youtube_notes
  RETURNING id INTO v_batch_id;

  -- ── Step 2: Clear existing posts for this batch (idempotent) ─────────────
  DELETE FROM batch_posts WHERE batch_id = v_batch_id;

  -- ── Step 3: YouTube — Monday — MePower™ ──────────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday,
    'youtube',
    'How to Raise a Confident Child: The Complete Somali Parenting Guide',
    E'PROGRAM: MePower™\n\nYouTube long-form: 5 confidence pillars for Somali parents\n\nHOOK [identity hook]: Are you accidentally destroying your child''s confidence without knowing it?\nPROBLEM: Most parents praise their children constantly but still see self-doubt growing. The issue isn''t what you say — it''s what your child believes about themselves.\nREFRAME: Confidence is not built through praise. It is built through small moments of genuine recognition — when you see your child, not just their results.\nTEACHING: The five pillars of unshakeable confidence: being seen, heard, trusted, challenged, and celebrated for who they are — not what they achieve. Each pillar needs a different parenting response.\nACTION: Tonight, ask your child: "What did you do today that you''re proud of?" then just listen without adding anything.\nCTA: Follow for weekly parenting strategies that build children from the inside out.',
    0,
    'scheduled'
  );

  -- ── Step 4: TikTok — Monday — MePower™ ──────────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday,
    'tiktok',
    'The One Word That Destroys Child Confidence',
    E'PROGRAM: MePower™\n\nHOOK [shock hook]: This one word — said with love — is destroying your child''s confidence.\nPROBLEM: Parents say "but" after every compliment. "You did well, BUT next time..." The child only hears the BUT.\nREFRAME: Your child''s brain deletes everything before BUT. It only remembers the criticism.\nTEACHING: Replace BUT with AND. "You did well, AND next time try this." One word changes everything.\nACTION: For the next 3 days, catch every BUT and replace it with AND.\nCTA: Follow — I share small changes that build confident children.',
    1,
    'scheduled'
  );

  -- ── Step 5: TikTok — Tuesday — Inner Power™ ──────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday + 1,
    'tiktok',
    'How to Build a Child Who Doesn''t Need External Validation',
    E'PROGRAM: Inner Power™\n\nHOOK [question hook]: What does your child do when no one is watching — do they still do the right thing?\nPROBLEM: Children who only behave for praise collapse when alone. They have no internal compass.\nREFRAME: True character is what your child does when no one is watching. That is what Inner Power means.\nTEACHING: Build internal values by asking "What do YOU think about what you did?" instead of "I''m proud of you." This trains self-evaluation over approval-seeking.\nACTION: This week, ask your child to judge their own behaviour before you give your opinion.\nCTA: Follow for Somali parenting wisdom that builds children from the inside.',
    2,
    'scheduled'
  );

  -- ── Step 6: TikTok — Wednesday — MePower™ ────────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday + 2,
    'tiktok',
    'Why Shy Children Need This — Not Encouragement',
    E'PROGRAM: MePower™\n\nHOOK [contrast hook]: Stop encouraging your shy child. Do this instead.\nPROBLEM: Encouragement like "you can do it!" creates more pressure. It signals you think they need help.\nREFRAME: Shy children don''t need encouragement. They need safety. Create safety first — confidence follows.\nTEACHING: Instead of pushing, stand next to them. Instead of speaking for them, wait. Presence communicates safety without pressure.\nACTION: Next time your child hesitates socially, stand beside them quietly and wait.\nCTA: Follow for daily parenting strategies for Somali families.',
    3,
    'scheduled'
  );

  -- ── Step 7: TikTok — Thursday — Inner Power™ ─────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday + 3,
    'tiktok',
    'The Discipline Mistake That Weakens Children',
    E'PROGRAM: Inner Power™\n\nHOOK [story hook]: I watched a parent punish their child for lying — and accidentally teach them to lie better.\nPROBLEM: Punishment-based discipline teaches children to avoid getting caught, not to value honesty.\nREFRAME: Children with strong values aren''t afraid of punishment — they have an internal reason to be honest.\nTEACHING: Build value-based discipline by saying "What do we believe in our family?" when boundaries are crossed. Connect behaviour to identity, not consequences.\nACTION: This week, say to your child: "In our family, we tell the truth even when it''s hard."\nCTA: Follow for parenting that builds children with unshakeable character.',
    4,
    'scheduled'
  );

  -- ── Step 8: TikTok — Friday — MindPower™ ─────────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday + 4,
    'tiktok',
    'How to Teach Your Child a Growth Mindset in 60 Seconds',
    E'PROGRAM: MindPower™\n\nHOOK [question hook]: Does your child say "I can''t do this"? Here''s the exact response that rewires their brain.\nPROBLEM: When children say "I can''t", parents either agree or over-reassure. Both leave the mindset unchanged.\nREFRAME: The word YET is the most powerful word in parenting. "I can''t do this" becomes "I can''t do this YET."\nTEACHING: Growth mindset is not positive thinking. It''s believing ability is built through effort. YET signals to the brain: this is learnable.\nACTION: Every time your child says "I can''t" this week — add YET out loud.\nCTA: Follow for practical parenting tools that work immediately.',
    5,
    'scheduled'
  );

  -- ── Step 9: TikTok — Saturday — DreamPower™ ──────────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday + 5,
    'tiktok',
    'Ask Your Child This Question Every Week',
    E'PROGRAM: DreamPower™\n\nHOOK [identity hook]: The parents raising vision-driven children ask this one question every week.\nPROBLEM: Most children have no vision for their future. They react to life instead of creating it.\nREFRAME: A child with a dream is a child with direction. Dreams are not childish — they are the GPS of a meaningful life.\nTEACHING: Ask your child every week: "If you could do anything and knew you could not fail, what would you do?" Don''t judge the answer. Write it down. Let the dream grow.\nACTION: Ask this question tonight at dinner or bedtime.\nCTA: Follow — helping Somali parents raise children who dream big and act bigger.',
    6,
    'scheduled'
  );

  -- ── Step 10: TikTok — Sunday — Slaying Dragons™ ──────────────────────────
  INSERT INTO batch_posts (batch_id, user_id, scheduled_date, platform, title, angle_notes, sort_order, status)
  VALUES (
    v_batch_id, v_user_id,
    v_monday + 6,
    'tiktok',
    'How to Raise a Child Who Faces Fear Instead of Running',
    E'PROGRAM: Slaying Dragons™\n\nHOOK [contrast hook]: Brave children are not born — they are made by how their parents respond to fear.\nPROBLEM: When children are scared, most parents say "don''t worry" or "there''s nothing to be scared of." This leaves the child alone with the fear.\nREFRAME: Fear is not the enemy. Avoiding fear is. Brave children learn that fear is information — not a stop sign.\nTEACHING: When your child is afraid, say: "I see you''re scared. That makes sense. Let''s figure out what we can do together." Then take one tiny step into the fear — together.\nACTION: Find one small thing your child fears this week and walk through it with them — one step.\nCTA: Follow for weekly parenting strategies that build emotionally strong children.',
    7,
    'scheduled'
  );

  RAISE NOTICE 'Bootstrap complete. Batch ID: %', v_batch_id;
  RAISE NOTICE 'Week: % through %', v_monday, v_monday + 6;
  RAISE NOTICE '8 posts created: 1 YouTube + 7 TikToks';
  RAISE NOTICE 'Programs: MePower x2, Inner Power x2, MindPower x1, DreamPower x1, Slaying Dragons x1';

END $$;

-- ── Verification ───────────────────────────────────────────────────────────────
-- Run this after the seed to confirm all 8 posts were created:

SELECT
  b.week_start,
  b.theme,
  COUNT(p.id)    AS post_count,
  STRING_AGG(
    p.platform || ' ' || TO_CHAR(p.scheduled_date, 'Dy'),
    ', ' ORDER BY p.sort_order
  ) AS schedule
FROM weekly_batches b
LEFT JOIN batch_posts p ON p.batch_id = b.id
WHERE b.week_start = DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::date
GROUP BY b.id, b.week_start, b.theme;
