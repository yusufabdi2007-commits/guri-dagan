import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 15, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large (max 25MB)" }, { status: 400 });
    }

    // 1. Transcribe with Whisper
    let transcript: string;
    try {
      const result = await Promise.race([
        openai.audio.transcriptions.create({
          file: audio,
          model: "whisper-1",
          response_format: "text",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Transcription timed out")), 30_000)
        ),
      ]);
      transcript = result as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    if (!transcript || transcript.trim().length < 3) {
      return NextResponse.json({ error: "Could not detect speech. Try speaking closer to the mic." }, { status: 422 });
    }

    // 2. Extract content ideas from transcript
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a content strategist for a Somali parenting coach who posts on TikTok and YouTube.
The creator speaks in Somali, English, or a mix of both.
Your job: extract clear content ideas from their voice note.

Return JSON:
{
  "ideas": [
    {
      "title": "Video title (under 80 characters, in English)",
      "hook": "Compelling first sentence to open the video (1 sentence)",
      "platform": "TikTok" or "YouTube",
      "category": one of: "Parenting Tips", "Emotional Intelligence", "Communication", "Discipline", "Child Development", "Family Life", "Self-Care", "Q&A"
    }
  ]
}

Generate 1–3 ideas. If the transcript mentions a specific story or experience, make it a TikTok.
If it's a longer explanation or educational topic, suggest YouTube too.`,
          },
          {
            role: "user",
            content: `Voice note transcript:\n"${transcript}"`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Generation timed out")), 20_000)
      ),
    ]);

    const content = completion.choices[0].message.content || "{}";
    let parsed: { ideas?: unknown[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { ideas: [] };
    }

    return NextResponse.json({
      transcript,
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
    });
  } catch (error) {
    console.error("Voice idea error:", error);
    return NextResponse.json({ error: "Failed to process voice note. Please try again." }, { status: 500 });
  }
}
