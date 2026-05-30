import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { hook } = await req.json();

    if (!hook?.trim()) {
      return NextResponse.json({ error: "Hook text required" }, { status: 400 });
    }

    const prompt = `You are a viral content strategist specializing in Somali parenting content on TikTok and YouTube Shorts.

Analyze this hook/title for a Somali parenting coach:

Hook: "${hook}"

Score it on these dimensions (0–100 each):
- emotional_score: How emotionally resonant is this for Somali parents?
- curiosity_score: Does it make people want to know more?
- retention_score: Will viewers keep watching past the first 3 seconds?
- clarity_score: Is the message immediately clear?
- virality_score: How likely is this to be shared or saved?

Also provide:
- overall_score: Weighted average (emotional 30%, curiosity 25%, retention 25%, clarity 10%, virality 10%)
- verdict: "Weak" | "Good" | "Strong" | "Viral"
- main_weakness: The biggest issue holding this hook back (1 sentence)
- rewrites: 3 improved versions that are stronger for Somali parenting audience
- emotional_alternatives: 2 more emotionally charged versions (can be more dramatic)
- audience_specific_tips: 2 tips specific to Somali-parent audience engagement

Return valid JSON only:
{
  "emotional_score": 0,
  "curiosity_score": 0,
  "retention_score": 0,
  "clarity_score": 0,
  "virality_score": 0,
  "overall_score": 0,
  "verdict": "Good",
  "main_weakness": "...",
  "rewrites": ["...", "...", "..."],
  "emotional_alternatives": ["...", "..."],
  "audience_specific_tips": ["...", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a viral content expert. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Score error:", error);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
