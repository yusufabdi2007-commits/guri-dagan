import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { transcript, filename } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: "Transcript required" }, { status: 400 });
    }

    const prompt = `You are an expert short-form video strategist for a Somali parenting coach.

Analyze this video transcript and identify the 5–8 best moments to clip into TikTok/YouTube Shorts.

Transcript:
"""
${transcript.slice(0, 6000)}
"""

For each clip suggestion, provide:
- title: A compelling video title
- hook: The first line that would stop scrolling (1–2 sentences max)
- start_time: Approximate start time in seconds (estimate based on transcript position)
- end_time: Approximate end time in seconds
- caption: Ready-to-post social media caption (include line breaks)
- emotional_score: 0–100 (how emotionally resonant is this moment?)
- retention_score: 0–100 (how likely is this to keep viewers watching?)
- why: One sentence explaining why this moment will perform well

Focus on:
- Emotional peaks (tears, strong advice, relatable struggles)
- Practical parenting tips stated clearly
- Surprising or counterintuitive insights
- Moments Somali parents will recognize immediately
- Strong openings that work as hooks

Return valid JSON only:
{
  "suggestions": [
    {
      "title": "...",
      "hook": "...",
      "start_time": 0,
      "end_time": 45,
      "caption": "...",
      "emotional_score": 85,
      "retention_score": 78,
      "why": "..."
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a short-form video strategist specializing in Somali parenting content. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No response");

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Shorts error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
