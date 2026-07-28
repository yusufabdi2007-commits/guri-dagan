import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = 'edge';
export const maxDuration = 60;

// Every day has 1 TikTok (Mon–Sun). YouTube posts Wednesday.
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Default program distribution for 7 TikToks — fixed, never changes
const PROGRAM_SLOTS = [
  "MePower™",         // Monday
  "Inner Power™",     // Tuesday
  "MePower™",         // Wednesday
  "Inner Power™",     // Thursday
  "MindPower™",       // Friday
  "DreamPower™",      // Saturday
  "Slaying Dragons™", // Sunday
];

const YOUTUBE_PROGRAM = "MePower™";

// Large fallback title pools (used only if AI is unavailable). MePower™ appears
// 3x/week and Inner Power™ 2x/week, so their pools are sized well above the
// ~5-week (40-post) recent-history window checked before reuse, so 100 straight
// weeks of pure fallback still never force an early repeat.
const FALLBACK_TITLE_POOLS: Record<string, string[]> = {
  "MePower™": [
    "Signs your child is losing confidence",
    "What to say after your child fails",
    "The praise habit that quietly backfires",
    "Why your child gives up too easily",
    "The moment your child stopped believing in themselves",
    "One sentence that rebuilds a child's confidence",
    "Why 'you can do it' doesn't work anymore",
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
    "The identity question every child needs answered",
    "How to raise a child who doesn't follow the crowd",
    "What real character looks like at age 10",
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
    "The mindset shift that changes everything for kids",
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
    "The question that reveals if your child has a vision",
    "Why your child has no answer for 'what do you want'",
    "Raising a child who dreams bigger than their screen",
    "The bedtime question that builds real ambition",
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
    "Why your child panics at anything new",
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

// `usedThisRun` is passed in explicitly (never module-level) so concurrent
// requests on the same edge isolate never share or corrupt each other's state.
//
// Two-tier selection: (1) never repeat a title already used elsewhere in THIS
// week's 8 slots — that's a hard rule; (2) prefer a title outside the recent
// history window, but if the whole pool has been used recently, fall back to
// whichever pool title was used longest ago (rather than looping back to the
// full unfiltered pool, which could reintroduce this week's own duplicates).
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
    // Whole pool used within the recent window — pick whichever title was
    // used longest ago (max index in the most-recent-first avoid list) to
    // spread repeats out as much as possible instead of clustering them.
    let best = basePool[0];
    let bestRecency = -1;
    for (const candidate of basePool) {
      const idx = avoidRecent.findIndex(a => a.toLowerCase() === candidate.toLowerCase());
      const recency = idx === -1 ? avoidRecent.length : idx; // never-seen ranks last (best)
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
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme, lowEnergy, topCategory, growingCategory, underusedCategory, recentThemes, recentTitles } = body;

  const categoryLines = [
    topCategory && `Best performing category: ${topCategory}`,
    growingCategory && growingCategory !== topCategory && `Fastest growing: ${growingCategory}`,
    underusedCategory && `Underused opportunity: ${underusedCategory}`,
  ]
    .filter(Boolean)
    .join("\n");

  const recentThemeLine =
    Array.isArray(recentThemes) && recentThemes.length > 0
      ? `Recent themes (avoid repeating): ${(recentThemes as string[]).join(", ")}`
      : "";

  const recentTitleLine =
    Array.isArray(recentTitles) && recentTitles.length > 0
      ? `Recent titles already used (never repeat these, never write anything close to them): ${(recentTitles as string[]).join(" | ")}`
      : "";

  const energyNote = lowEnergy
    ? "LOW ENERGY WEEK: Pick warm, story-based, relatable topics."
    : "";

  const t =
    (typeof theme === "string" && theme.trim().length > 2 && theme.trim()) ||
    (typeof topCategory === "string" && topCategory) ||
    "child confidence and parenting";

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(buildFallback(t, topCategory, theme, Array.isArray(recentTitles) ? recentTitles as string[] : []));
  }

  try {
    const weekDate = new Date().toISOString().split("T")[0]; // changes every week = fresh titles

    const prompt = `You are naming 8 SHORT parenting video titles for Guri Dagan (Somali parenting coach). Week of: ${weekDate}.
Theme: "${t}"
${categoryLines ? categoryLines + "\n" : ""}${recentThemeLine ? recentThemeLine + "\n" : ""}${recentTitleLine ? recentTitleLine + "\n" : ""}${energyNote ? energyNote + "\n" : ""}
The presenter already knows her format and delivery — she does NOT need a script. Your ONLY job is to give her one fresh, specific, scroll-stopping TITLE per video slot. No hooks, no scripts, no talking points — just the title.

RULE: Every title must be completely unique — a different angle, moment, or question each time. Never reuse or lightly reword a previous title.

VIDEO SLOTS (one title each):
1. YouTube Wed — MePower™
2. TikTok Mon — MePower™
3. TikTok Tue — Inner Power™
4. TikTok Wed — MePower™
5. TikTok Thu — Inner Power™
6. TikTok Fri — MindPower™
7. TikTok Sat — DreamPower™
8. TikTok Sun — Slaying Dragons™

Each title: max 10 words, specific, curiosity-driven, no clickbait punctuation spam.

Return valid JSON only:
{
  "theme": "...",
  "suggested_theme": true,
  "category_used": null,
  "youtube": { "program": "MePower™", "title": "..." },
  "tiktoks": [
    { "day": "Monday", "program": "MePower™", "title": "..." },
    { "day": "Tuesday", "program": "Inner Power™", "title": "..." },
    { "day": "Wednesday", "program": "MePower™", "title": "..." },
    { "day": "Thursday", "program": "Inner Power™", "title": "..." },
    { "day": "Friday", "program": "MindPower™", "title": "..." },
    { "day": "Saturday", "program": "DreamPower™", "title": "..." },
    { "day": "Sunday", "program": "Slaying Dragons™", "title": "..." }
  ]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You write short, specific parenting video titles only — never scripts, never hooks, never talking points. Return valid JSON only. No markdown, no code blocks, no text outside the JSON object." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq ${groqRes.status}: ${errText.slice(0, 200)}`);
    }
    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from Groq");

    const parsed = JSON.parse(content);
    if (
      !parsed.theme ||
      !parsed.youtube?.title ||
      !Array.isArray(parsed.tiktoks) ||
      parsed.tiktoks.length < 5
    ) {
      throw new Error("Invalid AI response shape");
    }
    // De-duplicate titles within this generation — if the AI repeated itself, swap in a fallback.
    // `seenTitles` (seeded with recentTitles) is the soft "avoid if possible" list across all
    // weeks; `usedThisRun` is the hard "never repeat within this week's own 8 slots" set.
    const seenTitles = new Set<string>(
      Array.isArray(recentTitles) ? (recentTitles as string[]).map(x => x.toLowerCase()) : []
    );
    const usedThisRun = new Set<string>();
    const dedupe = (title: string, program: string): string => {
      const key = (title || "").trim().toLowerCase();
      if (!key || seenTitles.has(key) || usedThisRun.has(key)) {
        const replacement = pickTitle(program, usedThisRun, [...seenTitles]);
        seenTitles.add(replacement.toLowerCase());
        return replacement;
      }
      seenTitles.add(key);
      usedThisRun.add(key);
      return title.trim();
    };
    // Pad to 7 if AI returned fewer (keep day/program from expected slots, use fallback title)
    while (parsed.tiktoks.length < 7) {
      const i = parsed.tiktoks.length;
      const program = PROGRAM_SLOTS[i] ?? PROGRAM_SLOTS[6];
      const title = pickTitle(program, usedThisRun, [...seenTitles]);
      seenTitles.add(title.toLowerCase());
      parsed.tiktoks.push({
        day: DAYS[i] ?? DAYS[6],
        program,
        title,
      });
    }
    parsed.youtube.title = dedupe(parsed.youtube.title, parsed.youtube.program || YOUTUBE_PROGRAM);
    parsed.tiktoks = parsed.tiktoks.map((tt: { day: string; program: string; title: string }) => ({
      day: tt.day,
      program: tt.program,
      title: dedupe(tt.title, tt.program),
    }));

    return NextResponse.json({ ...parsed, is_fallback: false });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Weekly assignment error:", errorMsg);
    return NextResponse.json(buildFallback(t, topCategory, theme, Array.isArray(recentTitles) ? recentTitles as string[] : [], errorMsg));
  }
}

function buildFallback(
  t: string,
  topCategory: unknown,
  theme: unknown,
  recentTitles: string[],
  errorMsg?: string
) {
  const themeLabel = t.charAt(0).toUpperCase() + t.slice(1);
  const usedThisRun = new Set<string>();

  const youtubeTitle = pickTitle(YOUTUBE_PROGRAM, usedThisRun, recentTitles);
  const tiktoks = DAYS.map((day, i) => {
    const program = PROGRAM_SLOTS[i];
    return {
      day,
      program,
      title: pickTitle(program, usedThisRun, recentTitles),
    };
  });

  return {
    theme: `${themeLabel} Transformation`,
    suggested_theme: !theme,
    category_used: typeof topCategory === "string" ? topCategory : null,
    youtube: { program: YOUTUBE_PROGRAM, title: youtubeTitle },
    tiktoks,
    is_fallback: true,
    ...(errorMsg ? { _error: errorMsg } : {}),
  };
}
