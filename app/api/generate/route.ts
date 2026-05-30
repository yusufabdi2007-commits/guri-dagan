import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { topic, platform, tone, audience } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const prompt = `You are an expert Somali parenting coach content creator. Create engaging content for a Somali parenting mentor/coach who helps Somali parents raise children better, improve family peace, and improve communication.

Topic: ${topic}
Platform: ${platform}
Tone: ${tone}
Target Audience: ${audience}

The content should:
- Be warm, practical, and culturally sensitive to Somali families
- Include Islamic values where appropriate
- Use emotional storytelling and relatable scenarios
- Be focused on real, actionable parenting advice
- Mix Somali and English where appropriate (but primarily in the voice of the content)
- Feel genuine and mission-driven, not generic

Return a JSON object with EXACTLY this structure:
{
  "hooks": ["hook1", "hook2", "hook3"],
  "titles": ["title1", "title2", "title3"],
  "captions": ["caption1 (short, punchy)", "caption2 (longer, storytelling)", "caption3 (question-based)"],
  "script": "A full 60-90 second talking head script with [PAUSE] markers...",
  "cta": ["cta1", "cta2", "cta3"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8"]
}

For ${platform}:
- TikTok hooks: 1-2 sentences that stop scrolling immediately, bold statements
- YouTube titles: SEO-friendly, emotional, "How to..." or question format
- Captions: Include line breaks for readability
- Script: Natural spoken language, conversational
- CTA: Ask to follow, comment with their experience, or share with another parent
- Hashtags: Mix of Somali parenting terms and English (#SomaliMom, #WaalidnimoDirayaasha, #ParentingAdvice, etc.)`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a Somali parenting content specialist. Always return valid JSON only, no markdown, no extra text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI request timed out")), 30_000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
