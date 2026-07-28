import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = 'edge';
export const maxDuration = 60;

// Fixed weekly program distribution — NEVER changes
const TIKTOK_PROGRAM_ORDER = [
  "MePower™",         // Mon
  "Inner Power™",     // Tue
  "MePower™",         // Wed
  "Inner Power™",     // Thu
  "MindPower™",       // Fri
  "DreamPower™",      // Sat
  "Slaying Dragons™", // Sun
] as const;

const YOUTUBE_PROGRAM = "MePower™";
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Fallback title pools — used only if AI is unavailable. MePower™ appears 3x/week
// and Inner Power™ 2x/week, so their pools are sized well above the ~5-week
// (40-post) recent-history window checked before reuse.
const FALLBACK_TITLE_POOLS: Record<string, string[]> = {
  "MePower™": [
    "Signs your child is losing confidence",
    "What to say after your child fails",
    "The praise habit that quietly backfires",
    "Why your child gives up too easily",
    "One sentence that rebuilds a child's confidence",
    "The confidence gap no parent notices in time",
    "The comparison trap that's quietly crushing your child",
    "Why praise alone doesn't build real confidence",
    "The moment your child gave up on themselves",
    "What silence after failure is really teaching your child",
    "The confidence lie most parents accidentally tell",
    "Why your child hides their mistakes from you",
    "The one habit that rebuilds a broken sense of self",
    "What your child's self-talk reveals about their confidence",
    "Why 'good job' isn't landing anymore",
    "The confidence rebuild every child eventually needs",
    "The question that reveals how your child sees themselves",
    "Why your child apologizes for things that aren't their fault",
    "What perfectionism is quietly costing your child",
    "The moment your child stopped raising their hand",
    "Why your child needs permission to be average sometimes",
    "The confidence your child fakes vs. the confidence they need",
    "What happens in your child's head after you say 'try again'",
    "The one fear behind almost every 'I give up'",
  ],
  "Inner Power™": [
    "The discipline mistake that destroys trust",
    "One value every child needs before age 10",
    "Why your child changes around different friends",
    "How to raise a child who doesn't follow the crowd",
    "The values conversation most parents skip",
    "Why your child says yes when they mean no",
    "The peer pressure moment every parent should expect",
    "What your child becomes when no one's watching",
    "The identity crisis hiding behind good behaviour",
    "Why your child copies whoever they're around",
    "The values gap between what you teach and what they do",
    "What your child does when you're not in the room",
    "The one rule every strong-willed child secretly needs",
    "Why your child folds under group pressure so easily",
    "The character test most parents don't realise is happening",
    "What 'everyone else is doing it' is really about",
  ],
  "MindPower™": [
    "The fixed mindset moment every parent misses",
    "Why 'I'm just bad at this' is a warning sign",
    "The one word that rewires how your child thinks",
    "How to respond when your child says 'I'm stupid'",
    "Why your child quits before they even start",
    "The thought pattern behind every 'I can't'",
    "How your child's inner voice decides their limits",
    "What your child believes about failure before they even try",
    "The mindset trap hiding inside 'I'm just not smart'",
    "Why some children bounce back and others shut down",
    "The thought your child repeats until it becomes true",
  ],
  "DreamPower™": [
    "How to help your child believe in their future",
    "Why your child has no answer for 'what do you want'",
    "Raising a child who dreams bigger than their screen",
    "Why your child has stopped imagining a future",
    "The vision gap between where they are and where they could go",
    "What a bored child is really telling you",
    "The one question that reignites a child's ambition",
    "Why 'I don't know' is your child's default answer now",
    "What happens when a child never gets asked about their future",
    "The dream your child gave up on without telling you",
  ],
  "Slaying Dragons™": [
    "What brave parenting actually looks like",
    "The avoidance habit that shrinks a child's world",
    "How courage is actually built in children",
    "The 10-second rule that builds real bravery",
    "The fear your child won't say out loud",
    "Why avoidance always feels like relief at first",
    "How to raise a child who doesn't run from hard things",
    "What your child's 'I don't want to go' is really saying",
    "The bravery your child already has and doesn't know about",
    "Why comfort zones get smaller the longer they're protected",
    "The one sentence that turns fear into a first step",
  ],
};

// Two-tier selection: never repeat a title already used elsewhere in this
// week's 8 slots (hard rule); prefer a title outside the recent history
// window, else fall back to whichever pool title was used longest ago.
function pickTitle(program: string, usedThisRun: Set<string>, avoidRecent: string[] = []): string {
  const pool = FALLBACK_TITLE_POOLS[program] || FALLBACK_TITLE_POOLS["MePower™"];
  const notUsedThisWeek = pool.filter(t => !usedThisRun.has(t.toLowerCase()));
  const basePool = notUsedThisWeek.length > 0 ? notUsedThisWeek : pool;

  const avoidSet = new Set(avoidRecent.map(a => a.toLowerCase()));
  const fresh = basePool.filter(t => !avoidSet.has(t.toLowerCase()));

  let pick: string;
  if (fresh.length > 0) {
    pick = fresh[Math.floor(Math.random() * fresh.length)];
  } else {
    let best = basePool[0];
    let bestRecency = -1;
    for (const candidate of basePool) {
      const idx = avoidRecent.findIndex(a => a.toLowerCase() === candidate.toLowerCase());
      const recency = idx === -1 ? avoidRecent.length : idx;
      if (recency > bestRecency) {
        bestRecency = recency;
        best = candidate;
      }
    }
    pick = best;
  }
  usedThisRun.add(pick.toLowerCase());
  return pick;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme, recentTitles } = body;
  if (!theme || typeof theme !== "string" || theme.trim().length < 3) {
    return NextResponse.json({ error: "Theme is required (min 3 characters)" }, { status: 400 });
  }
  const t = theme.trim();
  const avoidTitles = Array.isArray(recentTitles) ? (recentTitles as string[]) : [];

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(buildFallback(t, avoidTitles, "GROQ_API_KEY not configured"));
  }

  const generationSeed = Math.random().toString(36).slice(2, 10).toUpperCase();

  try {
    const weekDate = new Date().toISOString().split("T")[0];

    const prompt = `Name 8 SHORT parenting video titles for Guri Dagan (Somali parenting coach). Week of: ${weekDate}. Variation seed: ${generationSeed} — this run MUST produce completely different titles from any previous generation.
Theme: "${t}"
${avoidTitles.length > 0 ? `Titles already used recently (never repeat or lightly reword any of these): ${avoidTitles.join(" | ")}\n` : ""}
The presenter already knows her format and delivery — she does NOT need a script. Your ONLY job is one fresh, specific, scroll-stopping TITLE per video slot. No hooks, no scripts, no talking points — just the title. Max 10 words each.

VIDEO SLOTS:
1. YouTube Wed — MePower™
2. TikTok Mon — MePower™
3. TikTok Tue — Inner Power™
4. TikTok Wed — MePower™
5. TikTok Thu — Inner Power™
6. TikTok Fri — MindPower™
7. TikTok Sat — DreamPower™
8. TikTok Sun — Slaying Dragons™

Return valid JSON only:
{
  "youtube_title": "...",
  "tiktok_titles": ["...", "...", "...", "...", "...", "...", "..."]
}`;

    const AI_SYSTEM = "You write short, specific parenting video titles only — never scripts, never hooks, never talking points. Return valid JSON only. No markdown, no code blocks, no text outside the JSON object.";

    async function callGroq(model: string, maxTokens: number): Promise<string> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28_000);
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: AI_SYSTEM },
              { role: "user", content: prompt },
            ],
            temperature: 1.0,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq(${model}) ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error(`No content from Groq(${model})`);
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    async function callOpenAI(): Promise<string> {
      if (!process.env.OPENAI_API_KEY) throw new Error("No OPENAI_API_KEY");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: AI_SYSTEM },
              { role: "user", content: prompt },
            ],
            temperature: 1.0,
            max_tokens: 400,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content from OpenAI");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    let rawContent: string;
    let aiModel = "groq-70b";
    try {
      rawContent = await callGroq("llama-3.3-70b-versatile", 400);
    } catch (groqErr) {
      console.warn("Groq 70B failed, trying Groq 8B:", groqErr instanceof Error ? groqErr.message : groqErr);
      aiModel = "groq-8b";
      try {
        rawContent = await callGroq("llama-3.1-8b-instant", 400);
      } catch (groqFastErr) {
        console.warn("Groq 8B failed, trying OpenAI:", groqFastErr instanceof Error ? groqFastErr.message : groqFastErr);
        aiModel = "openai-gpt4o-mini";
        rawContent = await callOpenAI(); // throws to outer catch → static fallback
      }
    }

    const parsed = JSON.parse(rawContent);
    if (
      !parsed.youtube_title ||
      !Array.isArray(parsed.tiktok_titles) ||
      parsed.tiktok_titles.length < 5
    ) {
      throw new Error("Invalid AI response shape");
    }

    // De-duplicate against recent titles + within this generation.
    // `seen` is the soft "avoid if possible" list across all weeks; `usedThisRun`
    // is the hard "never repeat within this week's own 8 slots" set.
    const seen = new Set<string>(avoidTitles.map(a => a.toLowerCase()));
    const usedThisRun = new Set<string>();
    const dedupe = (title: unknown, program: string): string => {
      const key = typeof title === "string" ? title.trim().toLowerCase() : "";
      if (!key || seen.has(key) || usedThisRun.has(key)) {
        const replacement = pickTitle(program, usedThisRun, [...seen]);
        seen.add(replacement.toLowerCase());
        return replacement;
      }
      seen.add(key);
      usedThisRun.add(key);
      return (title as string).trim();
    };

    const youtube_title = dedupe(parsed.youtube_title, YOUTUBE_PROGRAM);

    const tiktok_titles: string[] = [];
    for (let i = 0; i < 7; i++) {
      const program = TIKTOK_PROGRAM_ORDER[i];
      tiktok_titles.push(dedupe(parsed.tiktok_titles[i], program));
    }

    const tiktok_scripts = tiktok_titles.map((title, i) => ({
      title,
      program: TIKTOK_PROGRAM_ORDER[i],
      day: DAY_NAMES[i],
    }));

    return NextResponse.json({
      youtube_title,
      youtube_program: YOUTUBE_PROGRAM,
      tiktok_scripts,
      ai_model: aiModel,
      seed: generationSeed,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Batch plan error:", errorMsg);
    return NextResponse.json({ ...buildFallback(t, avoidTitles, errorMsg), seed: generationSeed });
  }
}

function buildFallback(t: string, avoidTitles: string[], errorMsg: string) {
  const usedThisRun = new Set<string>();
  const youtube_title = pickTitle(YOUTUBE_PROGRAM, usedThisRun, avoidTitles);
  const tiktok_scripts = TIKTOK_PROGRAM_ORDER.map((program, i) => ({
    title: pickTitle(program, usedThisRun, avoidTitles),
    program,
    day: DAY_NAMES[i],
  }));

  return {
    youtube_title,
    youtube_program: YOUTUBE_PROGRAM,
    tiktok_scripts,
    is_fallback: true,
    fallback_reason: errorMsg,
  };
}
