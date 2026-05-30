import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const { question, source } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a content strategist for a Somali parenting coach.
An audience member asked a question. Convert it into a compelling content idea.
Return JSON: { "title": string, "hook": string, "platform": "TikTok"|"YouTube", "category": string }
- title: clear video title under 80 chars
- hook: a powerful 1-sentence opener for the video that mirrors the parent's pain or curiosity
- platform: TikTok for short/emotional, YouTube for deeper/educational
- category: one of Parenting Tips | Emotional Intelligence | Communication | Discipline | Child Development | Family Life | Self-Care | Q&A`,
          },
          {
            role: "user",
            content: `Audience question (source: ${source || "unknown"}):\n"${question}"`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out")), 15_000)
      ),
    ]);

    const content = completion.choices[0].message.content || "{}";
    let idea: unknown;
    try {
      idea = JSON.parse(content);
    } catch {
      idea = { title: question.slice(0, 80), hook: "", platform: "TikTok", category: "Q&A" };
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error("Inbox convert error:", error);
    return NextResponse.json({ error: "Failed to generate idea" }, { status: 500 });
  }
}
