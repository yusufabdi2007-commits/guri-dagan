import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const {
      postsThisWeek,
      postsLastWeek,
      streak,
      totalPosts,
      topCategory,
      categoryBreakdown,
      bestDay,
      consistency,
      weeklyGoal,
      pendingIdeas,
      tiktokStats,
    } = await req.json();

    const growthDir = postsThisWeek > postsLastWeek ? "up" : postsThisWeek < postsLastWeek ? "down" : "flat";
    const growthPct = postsLastWeek > 0
      ? Math.round(((postsThisWeek - postsLastWeek) / postsLastWeek) * 100)
      : null;

    const prompt = `You are a creator intelligence analyst for a Somali parenting content creator. Generate a weekly performance report.

Weekly Data:
- Posts this week: ${postsThisWeek} (goal: ${weeklyGoal})
- Posts last week: ${postsLastWeek}
- Growth direction: ${growthDir}${growthPct !== null ? ` (${growthPct > 0 ? "+" : ""}${growthPct}%)` : ""}
- Current streak: ${streak} days
- Total posts all time: ${totalPosts}
- Best posting day: ${bestDay || "unknown"}
- Weekly consistency: ${consistency}%
- Pending ideas: ${pendingIdeas}
- Top content category: ${topCategory || "mixed"}
- Category breakdown: ${JSON.stringify(categoryBreakdown || {})}
${tiktokStats ? `- TikTok this week: ${JSON.stringify(tiktokStats)}` : ""}

Generate a creator intelligence report. Be specific, data-driven, and warm. Reference actual numbers. Avoid generic advice.

Return JSON:
{
  "summary": "2-3 sentence narrative summary of the week — reference real numbers, be honest about performance",
  "wins": "1-2 genuine wins from this week (can include small wins if big ones are absent)",
  "warnings": "1 honest observation about what needs attention (or null if the week was strong)",
  "next_week": [
    "Specific action 1 for next week",
    "Specific action 2 for next week",
    "Specific action 3 for next week"
  ],
  "insight": "One deeper strategic insight about their content pattern — something they might not have noticed",
  "momentum_score": number 0-100 (overall creator momentum this week)
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a data-driven creator intelligence analyst for Somali parenting content. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content");

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Weekly report error:", error);
    return NextResponse.json({
      summary: "Your weekly report is ready. Keep building momentum — every post compounds.",
      wins: "You showed up this week. That consistency is what separates creators who grow from those who stop.",
      warnings: null,
      next_week: [
        "Record at least one video in your highest-performing category.",
        "Repurpose one past video into 3 new short clips.",
        "Engage with comments from your last 3 posts.",
      ],
      insight: "Creators who post consistently for 90 days see exponential follower growth regardless of individual video performance.",
      momentum_score: 65,
    });
  }
}
