import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  // Read body ONCE before try/catch — req.json() can only be called once per request
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { streak, totalPosts, postedToday, consistency, pendingIdeas, weeklyGoal, tone, language } = body;

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const useSomali = language === "Somali";

    const prompt = `You are a warm, supportive AI coach for a Somali parenting content creator.

Creator Stats:
- Current streak: ${streak} days
- Posted today: ${postedToday ? "yes" : "no"}
- Total posts all time: ${totalPosts}
- Weekly consistency: ${consistency}% of ${weeklyGoal} weekly goal
- Pending content ideas: ${pendingIdeas}
- Time of day: ${timeOfDay}
- Preferred tone: ${tone || "Warm & Encouraging"}

${useSomali
  ? `Generate a short, personal coaching message IN SOMALI LANGUAGE. Be:
- Dhiirrigelinta (encouraging) and emotionally intelligent
- Specific to their stats (mention the streak or progress naturally)
- Rooted in their mission (gargaarka xubnaha qoyska Soomaalida adduunka)
- Max 2 sentences in Somali

Also generate a specific "next action" suggestion in Somali (1 sentence, actionable).

Return JSON:
{
  "message": "...(in Somali)...",
  "next_action": "...(in Somali)..."
}`
  : `Generate a short, personal coaching message. Be:
- Warm and emotionally intelligent
- Specific to their stats (mention the streak, progress, or pending ideas naturally)
- Motivating without being generic
- Rooted in their mission (helping Somali families internationally)
- Max 2 sentences

Also generate a specific "next action" suggestion (1 sentence, actionable).

Return JSON:
{
  "message": "...",
  "next_action": "..."
}`}`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: useSomali
              ? "You are an emotionally intelligent coach who responds fluently in Somali. Return valid JSON only."
              : "You are an emotionally intelligent coach. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 250,
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
    console.error("Coach error:", error);
    const useSomali = body.language === "Somali";

    const fallbacks = useSomali
      ? [
          "Xaaladaadu waxay u baahan tahay in aad sameyso mid ka dib mid. Raac hadafkaaga.",
          "Bulshadaada Soomaaliyeed waxay u baahan tahay codkaaga — sii wad.",
          "Aqoontu horeba ayaad leedahay. Waxaad u baahan tahay in aad riixdo badhanka diiwaangelinta.",
        ]
      : [
          "Your consistency is quietly changing lives — every post you share reaches a family that needs it.",
          "The Somali community trusts you because you show up. Keep showing up.",
          "You already have the knowledge. The only thing left is to press record.",
        ];

    const nextActions = useSomali
      ? ["Fur liistada fikradahaaga oo dooro mid maanta aad duubeyso."]
      : ["Open your ideas list and pick one to record today."];

    return NextResponse.json({
      message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      next_action: nextActions[0],
    });
  }
}
