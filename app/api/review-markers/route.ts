import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoId, title, notes, duration } = await req.json();
  if (!videoId || !title) return NextResponse.json({ error: "Missing videoId or title" }, { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const durationStr = duration
    ? `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s (${Math.round(duration)}s total)`
    : "duration unknown — assume 5-10 minutes";

  let completion;
  try {
    completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `You are an expert YouTube retention analyst reviewing a Somali parenting coaching video.

Title: "${title}"
Duration: ${durationStr}
Notes/Description: ${notes || "Not provided"}

Generate 8-12 intelligent review markers distributed across the video. These help the creator identify key moments during pre-export review on a cinematic review dashboard.

Return ONLY valid JSON with this exact structure:
{
  "markers": [
    {
      "marker_type": "Hook",
      "timestamp_seconds": 5,
      "confidence_score": 0.9,
      "explanation": "Critical hook window. Viewer decides to stay or leave here."
    }
  ]
}

Marker types to use (each 1-3 times as appropriate):
- "Hook" — hook placement zones (typically 0–30s, sometimes 0–5s for shorts)
- "Emotional Peak" — moments of high emotional engagement and connection
- "Dead Zone" — sections likely to cause viewer drop-off (slow pacing, filler, repetition)
- "Silence Gap" — awkward silence or poor audio pacing that hurts retention
- "Replay-Worthy" — moments viewers would rewatch, share, or screenshot
- "Retention Opportunity" — where a re-edit could boost watch time significantly
- "Strong CTA" — effective calls-to-action placement windows

Rules:
- Spread timestamps naturally across the full video duration
- confidence_score must be 0.70–0.95 (never 1.0)
- Explanations: 1 sentence, specific and actionable, no vague generic advice
- For unknown duration, spread across 0–480 seconds
- Include at least 1 "Hook", 1 "Emotional Peak", and 1 "Dead Zone"
- Prioritize markers that will have real operational impact`,
        }],
        response_format: { type: "json_object" },
        temperature: 0.6,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI request timed out after 30s")), 30_000)
      ),
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  let parsed: { markers?: unknown[] } = {};
  try {
    parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
  } catch {
    return NextResponse.json({ error: "AI returned an unreadable response. Please retry." }, { status: 502 });
  }
  const aiMarkers = (parsed.markers ?? []).map((m: any) => ({
    user_id: user.id,
    video_id: videoId,
    marker_type: String(m.marker_type ?? "Retention Opportunity"),
    timestamp_seconds: Math.max(0, Number(m.timestamp_seconds) || 0),
    confidence_score: Math.min(0.95, Math.max(0.7, Number(m.confidence_score) || 0.8)),
    explanation: m.explanation ? String(m.explanation) : null,
    is_resolved: false,
    is_ai_generated: true,
  }));

  // Clear existing AI markers for this video
  await supabase
    .from("review_markers")
    .delete()
    .eq("video_id", videoId)
    .eq("user_id", user.id)
    .eq("is_ai_generated", true);

  const { data: saved, error } = await supabase
    .from("review_markers")
    .insert(aiMarkers)
    .select();

  if (error) {
    // Table may not exist yet — return markers as temporary objects
    return NextResponse.json({
      markers: aiMarkers.map((m: any, i: number) => ({
        ...m,
        id: `temp-${Date.now()}-${i}`,
      })),
      warning: "Markers not persisted. Run 011_review_schema.sql in Supabase.",
    });
  }

  return NextResponse.json({ markers: saved });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { markerId, is_resolved } = await req.json();
  if (!markerId) return NextResponse.json({ error: "Missing markerId" }, { status: 400 });

  const { data, error } = await supabase
    .from("review_markers")
    .update({ is_resolved })
    .eq("id", markerId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ marker: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

  await supabase
    .from("review_markers")
    .delete()
    .eq("video_id", videoId)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
