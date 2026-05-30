import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { category } = await req.json();

    const prompt = `You are a content strategist for a Somali parenting coach creating TikTok/YouTube content.

Generate a detailed content topic cluster for this parenting category: "${category}"

For Somali parents specifically, provide:
- 6 pain_points: Real struggles Somali parents face in this category (short, specific, emotional)
- 6 content_ideas: Specific video ideas addressing these pain points
- 4 emotional_triggers: Core emotional drivers that make Somali parents engage with this topic
- 4 questions: Questions Somali parents are secretly asking about this topic
- 3 hook_starters: Hook opening lines that would stop scrolling for Somali parents

Consider:
- Cultural context (diaspora, Islamic values, generational gaps)
- Language blend (Somali/English code-switching parents)
- Common family dynamics in Somali households
- Pressures from community expectations

Return valid JSON only:
{
  "pain_points": ["...", "..."],
  "content_ideas": ["...", "..."],
  "emotional_triggers": ["...", "..."],
  "questions": ["...", "..."],
  "hook_starters": ["...", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a Somali parenting content strategist. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Trends error:", error);
    return NextResponse.json({ error: "Failed to generate trends" }, { status: 500 });
  }
}
