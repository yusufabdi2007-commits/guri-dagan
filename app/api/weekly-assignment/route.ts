import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// Recording is Monday. Posting: YouTube on Sunday, TikToks Tue–Sat + 2 on Sunday.
const DAYS = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Sunday"];

// Default program distribution for 7 TikToks
// YouTube is assigned separately (usually the highest-engagement program)
const PROGRAM_SLOTS = [
  "MePower™",         // Tuesday
  "Inner Power™",     // Wednesday
  "MePower™",         // Thursday
  "Inner Power™",     // Friday
  "MindPower™",       // Saturday
  "DreamPower™",      // Sunday
  "Slaying Dragons™", // Sunday
];

const FALLBACK_TIKTOKS = [
  { title: "Signs your child is losing confidence", program: "MePower™" },
  { title: "The discipline mistake that destroys trust", program: "Inner Power™" },
  { title: "What to say after your child fails", program: "MePower™" },
  { title: "One value every child needs before age 10", program: "Inner Power™" },
  { title: "Why your child gives up too easily", program: "MindPower™" },
  { title: "How to help your child believe in their future", program: "DreamPower™" },
  { title: "What brave parenting actually looks like", program: "Slaying Dragons™" },
];

const HOOK_TYPES = ["fear hook", "mistake hook", "identity hook", "emotional truth hook"];

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme, lowEnergy, topCategory, growingCategory, underusedCategory, recentThemes } = body;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const categoryLines = [
      topCategory && `Best performing category: ${topCategory}`,
      growingCategory && growingCategory !== topCategory && `Fastest growing: ${growingCategory}`,
      underusedCategory && `Underused opportunity: ${underusedCategory}`,
    ]
      .filter(Boolean)
      .join("\n");

    const recentLine =
      Array.isArray(recentThemes) && recentThemes.length > 0
        ? `Recent themes (avoid repeating): ${(recentThemes as string[]).join(", ")}`
        : "";

    const energyNote = lowEnergy
      ? "LOW ENERGY WEEK: Choose warm, story-based, relatable topics. Keep scripts simple and personal."
      : "";

    const themeInstruction =
      typeof theme === "string" && theme.trim().length > 2
        ? `Use this theme provided by the creator: "${theme.trim()}"`
        : `Suggest the best theme based on the performance data and programs below.`;

    const prompt = `You are a content strategy AI for a Somali parenting coach — Guri Dagan. Every video she creates belongs to one of her 5 signature programs. These programs form her business model: content → program → child transformation → client conversion.

THE 5 PROGRAMS:
• MePower™ — confidence, self-esteem, identity (child believes in themselves)
• Inner Power™ — values, discipline, identity strength (child has strong character)
• MindPower™ — mindset, thoughts, positive thinking (child thinks like a winner)
• DreamPower™ — motivation, imagination, future vision (child is vision-driven)
• Slaying Dragons™ — fear, resilience, emotional strength (child faces fear bravely)

Performance Intelligence:
${categoryLines || "No category data — use best judgement for a Somali parenting audience."}
${recentLine}
${energyNote}

Task: ${themeInstruction}

YOUR MISSION: Create content that makes parents FEEL the pain of where they are, see the transformation possible, and want to enroll in the specific program. This is NOT a tips channel — it is a sales funnel. Teach just enough to build trust. Sell the program, not the lesson.

ENROLLMENT CTAs per program:
- MePower™: DM me "MEPOWER" or book a free call (link in bio)
- Inner Power™: DM me "INNERPOWER" or book a free call (link in bio)
- MindPower™: DM me "MINDPOWER" or book a free call (link in bio)
- DreamPower™: DM me "DREAMPOWER" or book a free call (link in bio)
- Slaying Dragons™: DM me "DRAGONS" or book a free call (link in bio)

PROGRAM DISTRIBUTION:
- YouTube (long-form, Sunday): assign to the program most aligned with the theme
- TikTok distribution: MePower™ × 2, Inner Power™ × 2, MindPower™ × 1, DreamPower™ × 1, Slaying Dragons™ × 1
- Posting days for TikToks: Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Sunday

MARKETING SCRIPT STRUCTURE (use for EVERY video — this is a sales funnel):
1. HOOK (0–3s): Bold truth, question, or provocation. Make the parent feel seen or challenged. Choose: fear hook / mistake hook / identity hook / emotional truth hook
2. PROBLEM (3–15s): Name the REAL specific pain. Agitate it. Make it hurt a little.
3. REFRAME (15–30s): ONE insight that shifts perspective. Tease the solution — do NOT give the full answer. Leave them wanting more.
4. TEACHING (30–50s): Prove expertise. Connect to the program's transformation. End on an open loop or cliffhanger. Teach the WHAT, not the HOW.
5. CLOSE (50–58s): Bridge to enrollment. Name the program. Make it feel urgent and personal.
6. CTA (58–60s): The exact enrollment call to action for that program.

RULES:
- TikTok: tight, 60 seconds max. Every word earns its place.
- YouTube: deeper authority-building (5–10 min), ends with a strong consultation booking push.
- NEVER give a complete solution for free. Give a taste that creates desire for the program.
- CTAs must name the specific program and drive to enrollment — not just "follow me."
- Titles must be specific, scroll-stopping, feel written for ONE parent.

Return valid JSON only:
{
  "theme": "...",
  "suggested_theme": true or false,
  "category_used": "... or null",
  "youtube": {
    "program": "MePower™",
    "title": "...",
    "hook_type": "identity hook",
    "hook": "...",
    "problem": "...",
    "reframe": "...",
    "teaching": "...",
    "close": "...",
    "notes": "2-3 sentences of content direction for recording",
    "cta": "..."
  },
  "tiktoks": [
    {
      "day": "Tuesday",
      "program": "MePower™",
      "title": "...",
      "hook_type": "fear hook",
      "hook": "...",
      "problem": "...",
      "reframe": "...",
      "teaching": "...",
      "close": "...",
      "cta": "..."
    },
    { "day": "Wednesday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Thursday", "program": "MePower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Friday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Saturday", "program": "MindPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Sunday", "program": "DreamPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Sunday", "program": "Slaying Dragons™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." }
  ],
  "recording_checklist": ["...", "...", "...", "...", "...", "...", "...", "..."]
}`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a content strategist. Return valid JSON only. Every video must belong to one of the 5 programs and follow the 7-part structure exactly." },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 6000,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 55_000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    const parsed = JSON.parse(content);
    if (
      !parsed.theme ||
      !parsed.youtube ||
      !Array.isArray(parsed.tiktoks) ||
      parsed.tiktoks.length !== 7
    ) {
      throw new Error("Invalid AI response shape");
    }

    return NextResponse.json({ ...parsed, is_fallback: false });
  } catch (error) {
    console.error("Weekly assignment error:", error);

    const t =
      (typeof theme === "string" && theme.trim()) ||
      (typeof topCategory === "string" && topCategory) ||
      "parenting";
    const themeLabel = t.charAt(0).toUpperCase() + t.slice(1);

    return NextResponse.json({
      theme: `${themeLabel} Transformation`,
      suggested_theme: !theme,
      category_used: typeof topCategory === "string" ? topCategory : null,
      youtube: {
        program: "MePower™",
        title: "How to Raise Confident Children: A Complete Guide for Somali Parents",
        hook_type: "identity hook",
        hook: "Are you accidentally raising a child who doesn't believe in themselves?",
        problem: "Most parents focus on mistakes without realising this slowly teaches children they are the problem — not their behaviour.",
        reframe: "Confidence is not something children are born with. It is built in tiny daily moments by what you say and how you respond.",
        teaching: "In MePower™, we don't fix behavior — we rebuild the root: your child's self-belief. Parents who've done this program say the shift happened faster than they expected. But it requires the right framework, not just good intentions.",
        close: "If you watched this and thought 'that's my child' — this is your sign. MePower™ has limited spots and I only work with parents who are ready.",
        notes: "Build authority on why daily praise patterns silently shape identity. Show the gap between what parents intend and what children absorb. End with a strong enrollment push.",
        cta: "Book a free 20-minute call from the link in my bio — let's talk about your child specifically.",
      },
      tiktoks: DAYS.map((day, i) => ({
        day,
        program: PROGRAM_SLOTS[i],
        title: FALLBACK_TIKTOKS[i].title,
        hook_type: HOOK_TYPES[i % HOOK_TYPES.length],
        hook: "Most parents are doing this without realising — and it's quietly costing their child.",
        problem: "When children feel unseen or uncorrected in the wrong way, they stop believing in themselves. And parents don't always see it happening.",
        reframe: "This isn't about being a perfect parent. It's about understanding the one thing that changes the pattern.",
        teaching: `The ${PROGRAM_SLOTS[i]} program exists exactly for this. Parents who've enrolled say it gave them the system they didn't know they were missing.`,
        close: `If this sounds like your child, ${PROGRAM_SLOTS[i]} might be the turning point.`,
        cta: `DM me "${PROGRAM_SLOTS[i].replace("™", "").replace(/ /g, "").toUpperCase()}" and I'll send you the details.`,
      })),
      recording_checklist: [
        "Water bottle nearby",
        "Good natural light or ring light on your face",
        "Phone fully charged or plugged in",
        "Room is quiet — notifications silenced",
        "YouTube notes visible (printed or on screen)",
        "Record YouTube first while energy is highest",
        "Take a short break before recording TikToks",
        "Record all 7 TikToks back-to-back for flow",
      ],
      is_fallback: true,
    });
  }
}
