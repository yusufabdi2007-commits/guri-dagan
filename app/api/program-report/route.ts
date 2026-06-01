import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const FALLBACK_REPORT = {
  best_program: "MePower™",
  fastest_growing: "Inner Power™",
  most_profitable: "MePower™",
  underused: "Slaying Dragons™",
  summary: "MePower™ continues to be your strongest program for generating leads and clients. Focus on confidence and self-esteem content this week as it resonates most with your Somali parenting audience. Inner Power™ is showing growth — double down on values and discipline topics. Slaying Dragons™ is underused; even one fear/resilience video this week could open a new audience segment.",
  focus_recommendation: "Record at least 2 MePower™ videos and 1 Slaying Dragons™ video this week.",
  is_fallback: true,
};

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const { programStats, totals, topProgram, fastestGrowing, mostProfitable, underused } = body as {
    programStats: Record<string, { videos: number; leads: number; clients: number; conversion: number; topTopics: string[] }>;
    totals: { videos: number; leads: number; clients: number };
    topProgram: string | null;
    fastestGrowing: string | null;
    mostProfitable: string | null;
    underused: string | null;
  };

  if (!programStats) return NextResponse.json({ ...FALLBACK_REPORT });

  const programLines = Object.entries(programStats)
    .map(([name, s]) =>
      `${name}: ${s.videos} videos, ${s.leads} leads, ${s.clients} clients (${s.conversion}% conversion)${s.topTopics.length ? `, top topics: ${s.topTopics.join(", ")}` : ""}`
    )
    .join("\n");

  const prompt = `You are a content business analyst for Guri Dagan — a Somali parenting coach with 5 signature programs:
• MePower™ — confidence & self-esteem
• Inner Power™ — values & discipline
• MindPower™ — mindset & positive thinking
• DreamPower™ — motivation & future vision
• Slaying Dragons™ — fear & resilience

PROGRAM PERFORMANCE DATA:
${programLines}

Totals: ${totals?.videos ?? 0} videos, ${totals?.leads ?? 0} leads, ${totals?.clients ?? 0} clients
Best by leads: ${topProgram ?? "unknown"}
Fastest growing (30 days): ${fastestGrowing ?? "unknown"}
Most profitable (clients): ${mostProfitable ?? "unknown"}
Underused (fewest videos): ${underused ?? "unknown"}

Write a concise weekly program performance report. Return valid JSON only:
{
  "best_program": "program name",
  "fastest_growing": "program name",
  "most_profitable": "program name",
  "underused": "program name",
  "summary": "2-3 sentences: what the data shows, which program is winning, what the creator should know",
  "focus_recommendation": "1 clear sentence: exactly what to record this week and why",
  "is_fallback": false
}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a content business analyst. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 25_000)),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ ...FALLBACK_REPORT });
  }
}
