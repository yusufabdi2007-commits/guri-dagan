import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { transcript, title, mode = "balanced", emotionalIntensity = "medium" } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    // Mode-specific instructions
    const modeInstructions: Record<string, string> = {
      balanced: "Generate a balanced mix of emotional and educational content. Standard length for all assets.",
      emotional: `Focus on emotional depth and storytelling. Make every asset pull at heartstrings. Emotional intensity: ${emotionalIntensity}. Longer captions, more personal language, more story references.`,
      educational: "Focus on clear, practical, step-by-step advice. Every asset should teach something specific. Use numbered tips, bullet-point thinking, how-to framing.",
      quick: "Generate short, punchy, ultra-shareable content. Every asset must be as short as possible. No filler words. High-impact only.",
    };

    const prompt = `You are a Somali parenting content repurposing expert. A creator has one long-form video. Your job is to extract maximum value from it by generating multiple short-form content assets.

Video Title: ${title || "Untitled"}
Transcript:
${transcript.slice(0, 4000)}

Mode: ${mode.toUpperCase()}
Mode instruction: ${modeInstructions[mode] || modeInstructions.balanced}

Analyze this transcript and identify:
1. The most emotional moment
2. The strongest hook line
3. Key story arc
4. Core parenting insight

Then generate ALL of these assets in JSON format:

Return EXACTLY this structure:
{
  "analysis": {
    "emotional_peak": "The most emotionally resonant moment in 1 sentence",
    "core_message": "The single most important insight from this video",
    "audience_pain": "The main pain point this video addresses"
  },
  "assets": [
    { "type": "tiktok_hook", "platform": "TikTok", "content": "Hook line that stops scrolling — first 3 seconds, bold statement" },
    { "type": "tiktok_hook", "platform": "TikTok", "content": "Second TikTok hook variation" },
    { "type": "tiktok_hook", "platform": "TikTok", "content": "Third TikTok hook — question format" },
    { "type": "youtube_shorts_title", "platform": "YouTube", "content": "YouTube Shorts title 1 — emotional" },
    { "type": "youtube_shorts_title", "platform": "YouTube", "content": "YouTube Shorts title 2 — how-to format" },
    { "type": "instagram_caption", "platform": "Instagram", "content": "Instagram caption with line breaks, emotional storytelling, 3-5 sentences, ends with question" },
    { "type": "instagram_caption", "platform": "Instagram", "content": "Shorter Instagram caption — punchy and direct" },
    { "type": "cta_variation", "platform": "All", "content": "CTA that asks parents to share their experience" },
    { "type": "cta_variation", "platform": "All", "content": "CTA that drives follow/subscribe" },
    { "type": "quote_graphic", "platform": "Instagram", "content": "One powerful quote from the video (10-15 words max) suitable for a graphic" },
    { "type": "quote_graphic", "platform": "Instagram", "content": "Second quote graphic option" },
    { "type": "community_post", "platform": "All", "content": "Community/Facebook post starting a conversation about this topic" },
    { "type": "hashtag_set", "platform": "All", "content": "#SomaliParenting #WaalidnimoDirayaasha #ParentingTips #SomaliMom #FamilyAdvice #IslamicParenting #RaisingChildren #ParentingCoach" }
  ]
}

Make all content warm, culturally sensitive for Somali families, and emotionally resonant. Mix Somali and English naturally where appropriate.
Apply the ${mode} mode instruction throughout ALL assets — this affects tone, length, and angle.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Somali parenting content specialist. Return valid JSON only, no markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Repurpose error:", error);
    return NextResponse.json({ error: "Failed to repurpose content" }, { status: 500 });
  }
}
