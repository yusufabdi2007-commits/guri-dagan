import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// Fixed weekly program distribution — NEVER changes
// 7 TikToks: Mon→MePower, Tue→Inner Power, Wed→MePower, Thu→Inner Power,
//             Fri→MindPower, Sat→DreamPower, Sun→Slaying Dragons
// YouTube: MePower™ (flagship, highest lead-conversion)
const TIKTOK_PROGRAM_ORDER = [
  "MePower™",        // Mon
  "Inner Power™",    // Tue
  "MePower™",        // Wed
  "Inner Power™",    // Thu
  "MindPower™",      // Fri
  "DreamPower™",     // Sat
  "Slaying Dragons™", // Sun
] as const;

const YOUTUBE_PROGRAM = "MePower™";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme } = body;
  if (!theme || typeof theme !== "string" || theme.trim().length < 3) {
    return NextResponse.json({ error: "Theme is required (min 3 characters)" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const t = theme.trim();

  try {
    const prompt = `You are a content strategist for a Somali parenting coach who creates educational parenting content.

Weekly Theme: "${t}"

PROGRAM DESCRIPTIONS:
- MePower™: confidence, self-esteem, identity → "From self-doubt to self-belief"
- Inner Power™: values, discipline, identity strength → "From external validation to internal values"
- MindPower™: mindset, positive thinking → "From fixed mindset to growth mindset"
- DreamPower™: motivation, imagination, future vision → "From passive to vision-driven"
- Slaying Dragons™: fear, resilience, emotional strength → "From fear-avoidance to brave action"

Generate a complete weekly content plan: 1 YouTube long-form + 7 TikTok short-form videos.

FIXED PROGRAM ASSIGNMENT (DO NOT CHANGE):
- YouTube: MePower™
- TikTok Mon: MePower™
- TikTok Tue: Inner Power™
- TikTok Wed: MePower™
- TikTok Thu: Inner Power™
- TikTok Fri: MindPower™
- TikTok Sat: DreamPower™
- TikTok Sun: Slaying Dragons™

For EACH video write a complete script:
- title: punchy short title (6–10 words)
- hookType: e.g. "identity hook", "question hook", "story hook", "shock hook", "contrast hook"
- hook: the very first line that stops the scroll (1–2 tight sentences)
- problem: the pain point the parent feels (1–2 sentences)
- reframe: a new perspective that shifts their thinking (1–2 sentences)
- teaching: the core lesson tied to the assigned program theme (2–3 sentences for YouTube, 1–2 for TikTok)
- action: ONE specific thing they can do today (1 sentence)
- cta: call to action — follow, share, or comment (1 sentence)

Rules:
- TikTok scripts must be tight (60 seconds max when spoken)
- YouTube script can be deeper (5–10 min long-form)
- Each video must cover a DIFFERENT angle of the theme
- All content is Somali-culture aware and parenting-focused
- Titles should feel specific and real, not generic

Return valid JSON only:
{
  "youtube_title": "...",
  "youtube_script": {
    "hookType": "...",
    "hook": "...",
    "problem": "...",
    "reframe": "...",
    "teaching": "...",
    "action": "...",
    "cta": "..."
  },
  "tiktok_scripts": [
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "action": "...", "cta": "..." }
  ]
}`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a content strategist. Return valid JSON only. No markdown fences." },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 2800,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 45_000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    const parsed = JSON.parse(content);
    if (
      !parsed.youtube_title ||
      !parsed.youtube_script?.hook ||
      !Array.isArray(parsed.tiktok_scripts) ||
      parsed.tiktok_scripts.length !== 7
    ) {
      throw new Error("Invalid AI response shape");
    }

    // Attach program and day to each TikTok
    const tiktok_scripts = parsed.tiktok_scripts.map((s: Record<string, string>, i: number) => ({
      ...s,
      program: TIKTOK_PROGRAM_ORDER[i],
      day: DAY_NAMES[i],
    }));

    return NextResponse.json({
      youtube_title: parsed.youtube_title,
      youtube_program: YOUTUBE_PROGRAM,
      youtube_script: parsed.youtube_script,
      tiktok_scripts,
    });
  } catch (error) {
    console.error("Batch plan error:", error);

    // Fallback: return structured placeholder scripts
    return NextResponse.json({
      youtube_title: `${t}: A Complete Guide for Somali Parents`,
      youtube_program: YOUTUBE_PROGRAM,
      youtube_script: {
        hookType: "question hook",
        hook: `Are you struggling with ${t.toLowerCase()} in your home right now?`,
        problem: "Most parents know something needs to change, but don't know where to start.",
        reframe: "The solution is closer than you think — it starts with one small shift.",
        teaching: `${t} is not about being a perfect parent. It's about showing up consistently in small moments. When you understand the root of the issue, everything becomes easier. Your child is watching and learning from you every day.`,
        action: `Tonight, take 5 minutes to reflect on one thing about ${t.toLowerCase()} you want to improve.`,
        cta: "Follow for weekly parenting strategies that actually work.",
      },
      tiktok_scripts: TIKTOK_PROGRAM_ORDER.map((program, i) => ({
        day: DAY_NAMES[i],
        program,
        title: `The truth about ${t.toLowerCase()} parents need to hear`,
        hookType: "shock hook",
        hook: `Nobody talks about this, but it's destroying your child's ${t.toLowerCase()}.`,
        problem: "Parents try everything — and still feel like it's not working.",
        reframe: "It's not about doing more. It's about doing the right thing.",
        teaching: `Focus on connection before correction. One moment of genuine understanding changes everything.`,
        action: `Say to your child tonight: "I see how hard you're trying."`,
        cta: "Follow for more parenting tips that build confident children.",
      })),
      is_fallback: true,
    });
  }
}
