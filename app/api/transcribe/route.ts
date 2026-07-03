import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Audio file required (send as multipart/form-data with field 'file')" }, { status: 400 });
    }
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Please use a file under 25MB. For longer recordings, extract just the audio first." },
        { status: 400 }
      );
    }

    let transcription;
    try {
      transcription = await Promise.race([
        openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Transcription timed out after 90 seconds")), 90_000)
        ),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    return NextResponse.json({
      text: transcription.text,
      segments: (transcription as unknown as { segments: unknown[] }).segments || [],
      duration: (transcription as unknown as { duration: number }).duration || 0,
    });
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json({ error: "Transcription failed. Check your OpenAI API key." }, { status: 500 });
  }
}
