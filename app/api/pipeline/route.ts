import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const {
      transcript,
      title,
      mode = "balanced",
      emotionalIntensity = 50,
    } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const modeInstructions: Record<string, string> = {
      balanced: "Create a balanced mix of emotional and educational content. Standard tone, varied hooks, wide audience appeal.",
      emotional: `Lean deeply into emotional storytelling. Pull at heartstrings. Every hook should create emotional resonance. Emotional intensity level: ${emotionalIntensity}/100 — use this to calibrate depth of feeling.`,
      educational: "Focus on practical, step-by-step advice and authority positioning. Every asset should promise clear value the viewer will learn. Use how-to framing.",
      quick: "Ultra-short, punchy, high-energy. Cut all filler words. Maximum impact in minimum words. Shareable, scroll-stopping content.",
      viral_push: "Aggressive hooks designed to stop the scroll. Use pattern interrupts, bold claims, and curiosity gaps. Optimize for the first 3 seconds. High-retention focus throughout.",
    };

    const intensityLabel =
      emotionalIntensity < 33
        ? "calm and warmly educational"
        : emotionalIntensity < 66
        ? "emotionally warm and relatable"
        : "intensely emotional and deeply personal";

    const prompt = `You are an AI Content Production Engine for a Somali parenting creator. Transform this transcript into a complete suite of production-ready short-form content assets.

Video Title: ${title || "Untitled Video"}
Transcript:
${transcript.slice(0, 5000)}

Mode: ${mode.toUpperCase()}
Mode Instruction: ${modeInstructions[mode] || modeInstructions.balanced}
Emotional Intensity: ${emotionalIntensity}/100 — tone should feel ${intensityLabel}

Deeply analyze this content. Identify the strongest emotional beats, key insights, and most viral-worthy moments. Then generate ALL assets below.

Return EXACTLY this JSON structure:
{
  "analysis": {
    "emotional_peak": "The single most emotionally powerful moment or line — 1 sentence",
    "core_message": "The one most important insight this video delivers — 1 sentence",
    "audience_pain": "The primary parenting pain point this video addresses — 1 sentence",
    "content_type": "emotional_story" or "educational" or "motivational" or "practical_tips" or "community",
    "estimated_length": "short" or "medium" or "long"
  },
  "clip_suggestions": [
    {
      "title": "Clip title — short and descriptive",
      "description": "Why this moment makes a strong standalone clip — 1 sentence",
      "start_cue": "First 5-7 words of this section from the transcript",
      "end_cue": "Last 5-7 words of this section",
      "estimated_duration": "30s",
      "retention_score": 82,
      "emotional_impact": 88,
      "clip_type": "hook_moment"
    },
    {
      "title": "Second clip",
      "description": "Why this moment works",
      "start_cue": "...",
      "end_cue": "...",
      "estimated_duration": "45s",
      "retention_score": 75,
      "emotional_impact": 70,
      "clip_type": "story_peak"
    },
    {
      "title": "Third clip",
      "description": "Why this moment works",
      "start_cue": "...",
      "end_cue": "...",
      "estimated_duration": "60s",
      "retention_score": 68,
      "emotional_impact": 65,
      "clip_type": "key_insight"
    }
  ],
  "tiktok_hooks": [
    { "hook": "TikTok hook 1 — bold opening that stops scrolling, 1-2 sentences", "style": "bold_claim" },
    { "hook": "TikTok hook 2 — second variation", "style": "story" },
    { "hook": "TikTok hook 3 — question format that demands answer", "style": "question" }
  ],
  "shorts_titles": [
    { "title": "YouTube Shorts title 1 — emotional angle, under 60 chars", "angle": "emotional" },
    { "title": "YouTube Shorts title 2 — educational/how-to angle", "angle": "educational" },
    { "title": "YouTube Shorts title 3 — curiosity/result angle", "angle": "curiosity" }
  ],
  "emotional_hooks": [
    { "hook": "Emotional hook 1 — leads with empathy and shared experience", "trigger": "love" },
    { "hook": "Emotional hook 2 — connects to a fear or worry parents feel", "trigger": "fear" },
    { "hook": "Emotional hook 3 — speaks to hope or transformation", "trigger": "hope" }
  ],
  "educational_hooks": [
    { "hook": "Educational hook 1 — practical promise of what they'll learn", "format": "how_to" },
    { "hook": "Educational hook 2 — numbered tips teaser", "format": "numbered_tips" },
    { "hook": "Educational hook 3 — myth bust or common mistake warning", "format": "myth_bust" }
  ],
  "cta_variations": [
    { "cta": "CTA 1 — invites parents to share their experience in comments", "goal": "comment" },
    { "cta": "CTA 2 — drives saves and shares with value promise", "goal": "save" },
    { "cta": "CTA 3 — drives follow with continuity promise", "goal": "follow" }
  ],
  "hashtags": {
    "primary": ["#SomaliParenting", "#WaalidnimoDirayaasha", "#ParentingTips", "#SomaliMom", "#FamilyFirst"],
    "somali": ["#HoyadaSomali", "#DhallaySomali", "#QoyskaSomali"],
    "niche": ["#IslamicParenting", "#RaisingChildren", "#ParentingCoach", "#MomLife"],
    "broad": ["#Parenting", "#FamilyAdvice", "#Motherhood"]
  },
  "community_posts": [
    { "post": "Community post 1 — conversational, starts discussion, ends with open question for parents to answer", "platform": "Facebook" },
    { "post": "Community post 2 — shorter version for Instagram caption, emotionally warm, ends with call to share", "platform": "Instagram" }
  ],
  "quote_graphics": [
    { "quote": "Powerful quote from the video — 10-15 words max, punchy", "attribution": "" },
    { "quote": "Second quote option — warm and relatable", "attribution": "" },
    { "quote": "Third quote option — educational or empowering", "attribution": "" }
  ],
  "thumbnail_texts": [
    { "text": "Bold thumbnail text 1 — 3-5 words, high contrast", "style": "bold_statement" },
    { "text": "Thumbnail text 2 — question format", "style": "question" },
    { "text": "Thumbnail text 3 — number or result format", "style": "number" }
  ],
  "strategist_note": "One insight connecting this content to high-performing Somali parenting patterns — be specific about what makes this transcript particularly strong or what angle would perform best"
}

Requirements:
- clip_suggestions: exactly 3 items, clip_type must be one of: hook_moment, story_peak, key_insight, cta_moment
- All hook/title/cta sections: exactly 3 items each
- hashtags: 5 primary, 3 somali, 4 niche, 3 broad
- community_posts: exactly 2 items
- quote_graphics: exactly 3 items
- thumbnail_texts: exactly 3 items
- Mix Somali and English naturally in hooks and titles where it feels authentic
- Apply ${mode} mode consistently throughout ALL assets`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Somali parenting content production engine. Return valid JSON only. No markdown, no code fences.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: "Pipeline generation failed. Please try again." },
      { status: 500 }
    );
  }
}
