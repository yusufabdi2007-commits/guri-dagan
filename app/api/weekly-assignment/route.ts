import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Default program distribution for 7 TikToks
// YouTube is assigned separately (usually the highest-engagement program)
const PROGRAM_SLOTS = [
  "MePower™",        // Monday
  "Inner Power™",    // Tuesday
  "MePower™",        // Wednesday
  "Inner Power™",    // Thursday
  "MindPower™",      // Friday
  "DreamPower™",     // Saturday
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

Generate a full program-first week plan. Every video MUST:
1. Belong to one of the 5 programs above
2. Follow the exact 7-part video structure
3. Have a title that creates urgency or emotion (6–10 words)

PROGRAM DISTRIBUTION:
- YouTube (long-form): assign to the program most aligned with the theme
- TikTok distribution: MePower™ × 2, Inner Power™ × 2, MindPower™ × 1, DreamPower™ × 1, Slaying Dragons™ × 1

7-PART VIDEO STRUCTURE (use this for EVERY video):
1. HOOK (0–3s): Emotional scroll-stopper. Choose ONE hook type: fear hook / mistake hook / identity hook / emotional truth hook
2. PROBLEM (3–10s): Describe a specific parent-child struggle clearly and emotionally
3. REFRAME (10–25s): Shift the parent's belief or offer a new insight
4. TEACHING (25–45s): ONE clear parenting principle they can act on
5. ACTION (45–60s): ONE simple thing the parent must do TODAY
6. PROGRAM TAG: Soft mention connecting to the program (e.g. "This is what MePower™ is all about")
7. CTA: Follow / save / join program

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
    "action": "...",
    "notes": "2-3 sentences of content direction for recording",
    "cta": "..."
  },
  "tiktoks": [
    {
      "day": "Monday",
      "program": "MePower™",
      "title": "...",
      "hook_type": "fear hook",
      "hook": "...",
      "problem": "...",
      "reframe": "...",
      "teaching": "...",
      "action": "...",
      "cta": "..."
    },
    { "day": "Tuesday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "day": "Wednesday", "program": "MePower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "day": "Thursday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "day": "Friday", "program": "MindPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "day": "Saturday", "program": "DreamPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "day": "Sunday", "program": "Slaying Dragons™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." }
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
        max_tokens: 2400,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 30_000)
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
        teaching: "Praise effort, not outcome. Say 'I saw how hard you tried' instead of 'You're so smart.'",
        action: "Tonight, find one moment to tell your child: 'I noticed you...' and finish with what you saw them do.",
        notes: "Cover the fundamentals of raising confident children in Somali households. Share 3 practical habits parents can start this week.",
        cta: "Comment below: what is one thing your child is working hard at right now?",
      },
      tiktoks: DAYS.map((day, i) => ({
        day,
        program: PROGRAM_SLOTS[i],
        title: FALLBACK_TIKTOKS[i].title,
        hook_type: HOOK_TYPES[i % HOOK_TYPES.length],
        hook: "This is something most parents miss — and it matters more than you think.",
        problem: "When parents focus only on results, children start to believe their worth depends on performance.",
        reframe: "One conversation at the right moment can change everything for your child.",
        teaching: "Connect before you correct. When your child is struggling, sit with them first.",
        action: i < 4 ? "Today, ask your child one question with no judgement: 'How are you feeling?'" : "This week, give your child one responsibility and let them lead it.",
        cta: i < 4 ? "Save this for later" : "Follow for daily parenting tips",
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
