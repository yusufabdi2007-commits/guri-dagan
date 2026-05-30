import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  // Read body ONCE — req.json() body stream can only be consumed once
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const mode = (body.mode as string) || "normal";
    const streak = (body.streak as number) || 0;
    const totalPosts = (body.totalPosts as number) || 0;
    const postedToday = Boolean(body.postedToday);
    const consistency = (body.consistency as number) || 0;
    const pendingIdeas = (body.pendingIdeas as number) || 0;
    const weeklyGoal = (body.weeklyGoal as number) || 5;
    const videosThisWeek = (body.videosThisWeek as number) || 0;
    const dayOfWeek = (body.dayOfWeek as string) || "";

    const modeContextMap: Record<string, string> = {
      normal: "The creator has normal energy today. Give a clear, focused single action.",
      low_energy: "The creator is tired or busy today. Suggest the absolute smallest possible action — something that takes 5-10 minutes maximum. Be gentle and compassionate. Remind them that small steps count.",
      quick_win: "The creator wants to build momentum fast. Suggest a high-impact action they can complete in 15 minutes or less that will feel like a real win.",
    };
    const modeContext = modeContextMap[mode as string] || "Give a clear single action.";

    const burnoutRisk =
      streak > 14 && consistency < 60
        ? "The creator has been posting for many days but consistency is slipping — possible burnout risk."
        : streak === 0
        ? "The creator has no streak currently — they need a gentle restart."
        : "";

    const prompt = `You are a daily momentum coach for a Somali parenting content creator.

Creator stats today (${dayOfWeek || "today"}):
- Current streak: ${streak} days
- Posted today: ${postedToday ? "yes" : "no"}
- Videos this week: ${videosThisWeek}/${weeklyGoal} goal
- Total posts all time: ${totalPosts}
- Pending ideas ready to use: ${pendingIdeas}
- Weekly consistency: ${consistency}%
- Mode selected: ${mode}
${burnoutRisk ? `\nImportant context: ${burnoutRisk}` : ""}

Mode instruction: ${modeContext}

Generate ONE clear daily suggestion. Rules:
- Maximum 1 action (not a list)
- Be specific and actionable (e.g. "Record a 60-second video on toddler screen time — you already have the idea saved")
- Warm, personal tone — never corporate or generic
- If burnout risk: acknowledge it with compassion first
- If mode is low_energy: the action must be completable in under 10 minutes

Also generate:
- A short motivational insight (1 sentence, connects their work to impact on Somali families)
- A burnout check message (only if there are signs of fatigue or streak = 0, otherwise null)

Return JSON:
{
  "suggestion": "...",
  "insight": "...",
  "burnout_message": "..." or null,
  "estimated_minutes": number (1-60)
}`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a warm, focused daily momentum coach. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 25_000)
      ),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content");

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Momentum error:", error);

    const mode = (body.mode as string) || "normal";

    const fallbacks: Record<string, object> = {
      normal: {
        suggestion: "Record one short video today on a parenting topic your audience has asked about recently.",
        insight: "Every video you share reaches a Somali parent who needs exactly what you know.",
        burnout_message: null,
        estimated_minutes: 20,
      },
      low_energy: {
        suggestion: "Write down one sentence: the most useful parenting tip you know. That's your next hook.",
        insight: "Small actions compound into real change for real families.",
        burnout_message: "It's okay to do less today. Even one small step forward keeps your momentum alive.",
        estimated_minutes: 5,
      },
      quick_win: {
        suggestion: "Open your ideas list, pick the top idea, and record a 30-second voice note explaining it. That's your script.",
        insight: "Your fastest videos often become your most-watched ones.",
        burnout_message: null,
        estimated_minutes: 10,
      },
    };

    return NextResponse.json(fallbacks[mode] || fallbacks.normal);
  }
}
