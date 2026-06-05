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

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const t = theme.trim();

  try {
    const prompt = `You are a conversion copywriter for a Somali parenting coach who sells 5 coaching programs. Your job is NOT to give free tips — it is to create content that makes parents feel the PAIN of where they are, glimpse the TRANSFORMATION possible, and want to enroll in the program.

Weekly Theme: "${t}"

THE COACH'S PROGRAMS (each video is assigned one — use it as the sales destination):
- MePower™: builds child confidence & self-belief. Transformation: "From self-doubt to unshakeable self-belief." Enrollment CTA: DM me "MEPOWER" or book a free call (link in bio).
- Inner Power™: builds values, discipline & internal identity. Transformation: "From needing approval to knowing who they are." Enrollment CTA: DM me "INNERPOWER" or book a free call (link in bio).
- MindPower™: rewires the child's mindset from fixed to growth. Transformation: "From 'I can't' to 'I'll figure it out'." Enrollment CTA: DM me "MINDPOWER" or book a free call (link in bio).
- DreamPower™: ignites motivation, vision and purpose. Transformation: "From passive to vision-driven." Enrollment CTA: DM me "DREAMPOWER" or book a free call (link in bio).
- Slaying Dragons™: builds resilience and courage to face fear. Transformation: "From fear-avoidance to brave action." Enrollment CTA: DM me "DRAGONS" or book a free call (link in bio).

FIXED PROGRAM ASSIGNMENT (DO NOT CHANGE):
- YouTube: MePower™
- TikTok Mon: MePower™
- TikTok Tue: Inner Power™
- TikTok Wed: MePower™
- TikTok Thu: Inner Power™
- TikTok Fri: MindPower™
- TikTok Sat: DreamPower™
- TikTok Sun: Slaying Dragons™

SCRIPT FRAMEWORK (use for every video — this is a sales funnel, not a tutorial):
1. hook — stop the scroll with a bold truth, question, or provocation (1–2 sentences). Make the parent feel seen or challenged.
2. problem — name the real, specific pain they live with. Agitate it. Make it hurt a little (1–2 sentences).
3. reframe — give them ONE insight that shifts their perspective. Tease the solution — don't give the full answer. Leave them wanting more (1–2 sentences).
4. teaching — teach just enough to prove you know what you're talking about. Connect the theme to the assigned program's transformation. End on a cliffhanger or open loop (2–3 sentences for YouTube, 1–2 for TikTok).
5. close — the bridge to enrollment. Reference the program by name. Make it feel urgent and personal (1 sentence).
6. cta — the exact call to action: DM keyword, comment, or book a call. Use the program's specific enrollment CTA (1 sentence).

RULES:
- TikTok scripts: tight, 60 seconds max when spoken. Every word earns its place.
- YouTube script: deeper authority-building (5–10 min), ends with a strong consultation booking push.
- Each of the 8 videos must cover a DIFFERENT angle of the theme — no repetition.
- All content is Somali-culture aware. Speak directly to Somali parents.
- Titles must be specific, scroll-stopping, and feel like they were written for ONE parent.
- NEVER give a full solution for free. Teach the WHAT, sell the HOW.
- The close and CTA must name the specific program and drive to enrollment, not just "follow me."

Return valid JSON only:
{
  "youtube_title": "...",
  "youtube_script": {
    "hookType": "...",
    "hook": "...",
    "problem": "...",
    "reframe": "...",
    "teaching": "...",
    "close": "...",
    "cta": "..."
  },
  "tiktok_scripts": [
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." }
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
    // Ensure close field exists (backfill from cta if missing)
    if (!parsed.youtube_script.close) parsed.youtube_script.close = parsed.youtube_script.cta;
    parsed.tiktok_scripts.forEach((s: Record<string, string>) => {
      if (!s.close) s.close = s.cta;
    });

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

    // Fallback: return structured marketing scripts
    return NextResponse.json({
      youtube_title: `Why Your Child Still Struggles With ${t} — And What Really Changes It`,
      youtube_program: YOUTUBE_PROGRAM,
      youtube_script: {
        hookType: "contrast hook",
        hook: `You've tried everything with your child around ${t.toLowerCase()} — and it's still not working. What if the problem isn't your child at all?`,
        problem: `Most Somali parents are doing everything they were taught — and their children are still losing confidence, shutting down, or acting out. The pain of watching your child struggle and not knowing why is exhausting.`,
        reframe: `The real issue isn't the behavior. It's that your child doesn't yet have the internal belief system to handle life's challenges. That's not a discipline problem — it's a development gap that has a specific solution.`,
        teaching: `In my MePower™ program, we don't patch symptoms. We rebuild the root — your child's self-belief and identity. Parents who've gone through it say the change happens faster than they expected, because we work on the right thing. I've seen children transform in weeks. But there's a process, and it requires the right guidance.`,
        close: `If you're watching this and thinking "that's my child" — this is your sign. MePower™ has limited spots and I only work with parents who are ready to commit.`,
        cta: `Book a free 20-minute call from the link in my bio — let's talk about your child specifically.`,
      },
      tiktok_scripts: TIKTOK_PROGRAM_ORDER.map((program, i) => ({
        day: DAY_NAMES[i],
        program,
        title: `The real reason your child struggles with ${t.toLowerCase()}`,
        hookType: "shock hook",
        hook: `Your child isn't the problem. The gap in their ${t.toLowerCase()} is. And it's 100% fixable.`,
        problem: `You've corrected, explained, and tried to motivate them — but nothing sticks. You're starting to wonder if this is just who they are.`,
        reframe: `It's not who they are. It's what they haven't been given yet. One structured system changes everything.`,
        teaching: `The ${program} program is built exactly for this. Parents see real shifts — not just in behavior, but in how their child sees themselves.`,
        close: `If you want to know if ${program} is right for your child, I'll tell you honestly in a quick call.`,
        cta: `DM me "${program.replace("™", "").replace(" ", "").toUpperCase()}" and I'll send you the details.`,
      })),
      is_fallback: true,
    });
  }
}
