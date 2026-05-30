import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

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

  try {
    const prompt = `You are a content strategist for a Somali parenting coach who creates educational parenting content.

The creator records ONE batch per week. From a single weekly theme, you must generate:
1. ONE YouTube long-form video title (7-12 words, educational, compelling)
2. 3-4 sentences of YouTube content notes (key points to cover in the video)
3. SEVEN TikTok short-form angles — each a specific, punchy talking point (6-10 words) derived from the same theme

Weekly Theme: "${theme.trim()}"

Rules:
- TikTok angles must each explore ONE distinct aspect of the theme (do not repeat ideas)
- Angles should range from emotional to practical to story-based
- All content is parenting-focused and Somali-culture aware
- Titles should feel specific and real, not generic

Return valid JSON only:
{
  "youtube_title": "...",
  "youtube_notes": "...",
  "tiktok_angles": ["angle 1", "angle 2", "angle 3", "angle 4", "angle 5", "angle 6", "angle 7"]
}`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a content strategist. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 25_000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    const parsed = JSON.parse(content);
    if (!parsed.youtube_title || !Array.isArray(parsed.tiktok_angles) || parsed.tiktok_angles.length !== 7) {
      throw new Error("Invalid AI response shape");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Batch plan error:", error);
    // Fallback plan using the theme
    const t = (theme as string).trim();
    return NextResponse.json({
      youtube_title: `${t}: A Complete Guide for Somali Parents`,
      youtube_notes: `Cover the core principles of ${t.toLowerCase()}. Discuss common mistakes parents make and how to avoid them. Share practical examples and actionable steps families can take this week.`,
      tiktok_angles: [
        `The one thing parents misunderstand about ${t.toLowerCase()}`,
        `Why your child needs this from you daily`,
        `Signs you are already doing this right`,
        `What Somali culture teaches us about this`,
        `The mistake most parents make without knowing`,
        `How to start even when you feel tired`,
        `What your child remembers 10 years from now`,
      ],
    });
  }
}
