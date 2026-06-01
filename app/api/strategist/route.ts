import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 15, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const {
      mode = "normal",
      streak,
      totalPosts,
      postedToday,
      consistency,
      weeklyGoal,
      videosThisWeek,
      dayOfWeek,
      pendingIdeas,
      missedDays,
      recentVideos = [],
      tiktokPosts = [],
      contentMemory = [],
      topCategories = [],
      bestHooks = [],
      categoryInsights = [],
      totalLeads = 0,
      clientCount = 0,
      callCount = 0,
      conversionRate = 0,
      topLeadCategories = [],
      totalEnrollments = 0,
      activeEnrollments = 0,
      totalRevenue = 0,
      topRevenueProgram = null,
      programRevenueSummary = [],
      totalChildren = 0,
      activeChildren = 0,
      graduatedChildren = 0,
      avgChildImprovement = 0,
      totalMilestones = 0,
      bestImprovementProgram = null,
    } = await req.json();

    const modeInstructions: Record<string, string> = {
      normal: "Give a clear, focused single best action for today.",
      low_energy: "The creator is tired. Suggest the smallest possible action (5-10 min max). Be gentle, warm, and compassionate.",
      growth: "The creator wants to grow. Suggest a high-retention, high-impact action targeting their strongest emotional content themes.",
      deep_impact: "Suggest a meaningful, educational long-form or storytelling action that builds deep community trust.",
      batch: "The creator wants to be productive. Suggest a batching workflow — record multiple short clips or prepare a content queue.",
    };

    const burnoutRisk =
      streak > 14 && consistency < 55
        ? "BURNOUT RISK: Creator has been posting for many days but consistency is dropping."
        : missedDays >= 3
        ? "RESTART NEEDED: Creator has missed 3+ days — needs a gentle, low-friction re-entry."
        : "";

    const topVideoThemes = recentVideos
      .filter((v: any) => v.emotional_tags?.length)
      .flatMap((v: any) => v.emotional_tags)
      .slice(0, 8)
      .join(", ");

    const tiktokTopTag = tiktokPosts.length
      ? [...tiktokPosts]
          .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
          .slice(0, 3)
          .map((p: any) => p.emotional_tag)
          .filter(Boolean)
          .join(", ")
      : null;

    const bestMemoryTopics = contentMemory
      .filter((m: any) => m.best_performing)
      .map((m: any) => m.topic)
      .slice(0, 4)
      .join(", ");

    const usedTopics = contentMemory
      .map((m: any) => m.topic)
      .filter(Boolean)
      .slice(0, 10)
      .join(", ");

    const topHook = bestHooks[0]?.hook_text || null;

    // Business intelligence summary
    const hasLeadData = totalLeads > 0;
    const leadSummary = hasLeadData
      ? `Total inquiries: ${totalLeads}, calls scheduled: ${callCount}, clients: ${clientCount}, conversion rate: ${conversionRate}%`
      : null;
    const topLeadCatSummary = topLeadCategories.length > 0
      ? topLeadCategories.map((c: any) => `${c.category}(${c.leads} leads)`).join(", ")
      : null;

    // Enrollment + revenue intelligence
    const hasEnrollmentData = totalEnrollments > 0;
    const enrollmentSummary = hasEnrollmentData
      ? `Enrolled clients: ${totalEnrollments} (${activeEnrollments} active), Total revenue: £${totalRevenue.toLocaleString()}, Top revenue program: ${topRevenueProgram ?? "unknown"}`
      : null;
    const progRevSummary = (programRevenueSummary as any[]).length > 0
      ? (programRevenueSummary as any[]).map((p: any) => `${p.program}(£${p.revenue})`).join(", ")
      : null;

    // Child outcome intelligence
    const hasChildData = totalChildren > 0;
    const childOutcomeSummary = hasChildData
      ? `Total children: ${totalChildren} (${activeChildren} active, ${graduatedChildren} graduated), Avg improvement: ${avgChildImprovement > 0 ? "+" : ""}${avgChildImprovement}%, Total milestones: ${totalMilestones}, Best program for outcomes: ${bestImprovementProgram ?? "not enough data"}`
      : null;

    // Build category performance summary from real YouTube data
    const catPerfSummary = categoryInsights.length > 0
      ? categoryInsights
          .map((c: any) => `${c.category}: avg ${c.avgViews} views (${c.count} videos, ${c.recentViews} recent views)`)
          .join("; ")
      : null;
    const bestCat = categoryInsights.length > 0 ? categoryInsights[0]?.category : null;
    const fastestCat = categoryInsights.length > 0
      ? [...categoryInsights].sort((a: any, b: any) => b.recentViews - a.recentViews)[0]?.category
      : null;

    const prompt = `You are an AI Content Strategist for a Somali parenting content creator. You analyze performance data and give highly specific, actionable guidance.

Creator Data:
- Day: ${dayOfWeek}
- Streak: ${streak} days
- Posted today: ${postedToday ? "yes" : "no"}
- Videos this week: ${videosThisWeek}/${weeklyGoal} goal
- Total posts ever: ${totalPosts}
- Pending ideas: ${pendingIdeas}
- Weekly consistency: ${consistency}%
- Missed days recently: ${missedDays}
- Creator mode: ${mode}
${burnoutRisk ? `\nALERT: ${burnoutRisk}` : ""}

Content Intelligence:
- Best emotional themes (from recent videos): ${topVideoThemes || "not enough data yet"}
- Top TikTok emotional tags: ${tiktokTopTag || "not tracked yet"}
- Best-performing memory topics: ${bestMemoryTopics || "not enough data yet"}
- Recently used topics (avoid repeating): ${usedTopics || "none yet"}
- Top performing hook style: ${topHook || "not scored yet"}
- Top content categories (by idea count): ${topCategories.map((c: any) => `${c.category}(${c.count})`).join(", ") || "mixed"}
${catPerfSummary ? `\nYouTube Category Performance (real view data):\n- Performance by category: ${catPerfSummary}\n- Best-performing category: ${bestCat || "unknown"}\n- Fastest-growing recently (last 30 days): ${fastestCat || "unknown"}` : ""}
${leadSummary ? `\nBusiness Intelligence (real client data):\n- ${leadSummary}\n- Top lead-generating content categories: ${topLeadCatSummary || "not tracked yet"}` : ""}${enrollmentSummary ? `\nEnrollment & Revenue (real data):\n- ${enrollmentSummary}\n- Revenue by program: ${progRevSummary || "not tracked yet"}` : ""}${childOutcomeSummary ? `\nChild Transformation Outcomes (real data):\n- ${childOutcomeSummary}` : ""}

Mode instruction: ${modeInstructions[mode] || modeInstructions.normal}

Generate a complete strategy response. Be specific — reference actual themes, topics, and real category performance data where available. Avoid generic advice. Write warmly but professionally.
${catPerfSummary ? "IMPORTANT: Use the YouTube category performance data to give category-specific recommendations (best-performing, fastest-growing, underutilized). Prioritize categories with proven high average views." : ""}
${leadSummary ? "BUSINESS FOCUS: Use the business intelligence data to prioritize content recommendations that not only get views but also generate coaching inquiries. If certain categories drive more leads, emphasize those in your recommendations." : ""}${enrollmentSummary ? `REVENUE FOCUS: Use the enrollment and revenue data to answer 'What should we focus on next to grow the business?' Identify which program generates the most revenue and recommend content that promotes underperforming programs. Highlight conversion opportunities between leads and consultations.` : ""}${childOutcomeSummary ? `OUTCOMES FOCUS: Use the child transformation data to answer 'Which program delivers the strongest results?' and 'What success stories should we create content around?' If average improvement is high, recommend creating testimonial or transformation content. If a program has strong outcomes, prioritize content that promotes it.` : ""}

Return valid JSON:
{
  "today_move": "One specific action sentence (e.g. 'Record a 60-second emotional story about teenage communication — your audience responds strongest to this theme')",
  "confidence": number 0-100 (how confident is this recommendation based on data),
  "reasoning": "2-3 sentence explanation of why this is the best move today based on their data",
  "estimated_impact": "One sentence describing expected outcome",
  "action_type": "record" | "repurpose" | "schedule" | "engage" | "plan",
  "creator_mode_detected": "strong" | "building" | "low" | "recovery",
  "momentum_note": "One warm, encouraging sentence about their current momentum state",
  "recommendations": [
    {
      "type": "Best Next Video" | "Repurpose This" | "Post Today" | "Underused Topic" | "High-Potential Hook" | "Emotional Opportunity" | "Trending Pain Point" | "Quick Win",
      "title": "short card title",
      "description": "1-2 sentence specific recommendation",
      "action": "specific next step verb phrase",
      "urgency": "high" | "medium" | "low"
    }
  ],
  "performance_insights": [
    {
      "icon_type": "up" | "down" | "warning" | "info",
      "insight": "One specific data-driven insight sentence"
    }
  ],
  "weekly_roadmap": [
    {
      "day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun",
      "energy": "high" | "medium" | "low",
      "task": "specific task for this day",
      "type": "record" | "repurpose" | "engage" | "rest"
    }
  ]
}

Requirements:
- recommendations: exactly 6 items
- performance_insights: exactly 4 items
- weekly_roadmap: exactly 7 items (Mon through Sun)
- If burnout risk detected: set creator_mode_detected to "recovery" and be compassionate
- Reference actual emotional themes and topics from their data where possible
- If no data yet: give smart defaults for a Somali parenting creator building their audience`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise AI content strategist. Always return valid JSON only. Never add markdown or code fences.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Strategist error:", error);

    return NextResponse.json({
      today_move:
        "Record a 60-second emotional story about a parenting challenge your audience faces daily.",
      confidence: 72,
      reasoning:
        "Emotional storytelling consistently outperforms educational content for Somali parenting creators. A short, personal video today keeps your momentum alive and requires minimal preparation.",
      estimated_impact:
        "Emotional shorts typically achieve 2-3x the watch time of educational formats.",
      action_type: "record",
      creator_mode_detected: "building",
      momentum_note:
        "Every video you post is a step toward the community you are building.",
      recommendations: [
        {
          type: "Best Next Video",
          title: "Emotional story short",
          description:
            "Record a 60-second personal story about a parenting moment. Story-based openings retain viewers longest.",
          action: "Record now",
          urgency: "high",
        },
        {
          type: "Repurpose This",
          title: "Repurpose your best video",
          description:
            "Take your highest-performing video and extract 3 short clips with new captions.",
          action: "Go to Repurpose",
          urgency: "medium",
        },
        {
          type: "Underused Topic",
          title: "Teen communication",
          description:
            "This topic consistently resonates with Somali parents but is underrepresented in your content.",
          action: "Add idea",
          urgency: "medium",
        },
        {
          type: "High-Potential Hook",
          title: "Direct emotional hook",
          description:
            'Start with "If you\'ve ever felt..." — this hook structure drives the strongest emotional connection.',
          action: "Score this hook",
          urgency: "low",
        },
        {
          type: "Trending Pain Point",
          title: "Screen time boundaries",
          description:
            "Screen time for children is a top parenting concern. Educational + emotional blend performs best.",
          action: "Generate script",
          urgency: "medium",
        },
        {
          type: "Quick Win",
          title: "Schedule 3 posts this week",
          description:
            "Add 3 videos to your calendar for this week. Planning ahead reduces decision fatigue.",
          action: "Open calendar",
          urgency: "low",
        },
      ],
      performance_insights: [
        {
          icon_type: "info",
          insight:
            "Emotional storytelling formats drive stronger watch time than purely educational content.",
        },
        {
          icon_type: "up",
          insight:
            "Creators who post 4-5 times per week see 3x faster audience growth in the first 90 days.",
        },
        {
          icon_type: "warning",
          insight:
            "Posting consistently on 2-3 set days builds audience expectations and repeat viewership.",
        },
        {
          icon_type: "info",
          insight:
            "Your pending ideas are ready to use — turning saved ideas into videos is the fastest path to output.",
        },
      ],
      weekly_roadmap: [
        { day: "Mon", energy: "high", task: "Record 1 emotional short", type: "record" },
        { day: "Tue", energy: "medium", task: "Repurpose top video into 3 clips", type: "repurpose" },
        { day: "Wed", energy: "high", task: "Record 1 educational short", type: "record" },
        { day: "Thu", energy: "low", task: "Schedule posts for weekend", type: "engage" },
        { day: "Fri", energy: "high", task: "Record batch: 2 talking head videos", type: "record" },
        { day: "Sat", energy: "medium", task: "Engage with comments + reply", type: "engage" },
        { day: "Sun", energy: "low", task: "Rest + plan next week ideas", type: "rest" },
      ],
    });
  }
}
