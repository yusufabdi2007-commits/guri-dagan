import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { parseScriptNotes } from "@/lib/programs";

const PROGRAM_NAMES = ["MePower™", "Inner Power™", "MindPower™", "DreamPower™", "Slaying Dragons™"] as const;

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all data in parallel
  const [{ data: leads }, { data: batchPosts }, { data: attribution }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, program, stage, created_at, source")
      .eq("user_id", user.id),
    supabase
      .from("batch_posts")
      .select("id, angle_notes, title, scheduled_date, status")
      .eq("user_id", user.id),
    supabase
      .from("content_attribution")
      .select("id, program, video_title, tiktok_topic, content_category")
      .eq("user_id", user.id),
  ]);

  const allLeads = leads || [];
  const allPosts = batchPosts || [];
  const allAttribution = attribution || [];

  // Build per-program stats
  const programStats: Record<string, {
    videos: number;
    leads: number;
    clients: number;
    conversion: number;
    topTopics: string[];
    topCtas: { cta: string; count: number }[];
    recentLeads: number; // last 30 days
  }> = {};

  for (const name of PROGRAM_NAMES) {
    // Videos: count batch_posts whose angle_notes parse to this program
    const programPosts = allPosts.filter(p => {
      const parsed = parseScriptNotes(p.angle_notes);
      return parsed.program === name;
    });

    // CTAs from this program's posts
    const ctaCounts: Record<string, number> = {};
    for (const post of programPosts) {
      const parsed = parseScriptNotes(post.angle_notes);
      if (parsed.cta) {
        const key = parsed.cta.toLowerCase().slice(0, 40);
        ctaCounts[key] = (ctaCounts[key] || 0) + 1;
      }
    }
    const topCtas = Object.entries(ctaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cta, count]) => ({ cta, count }));

    // Leads attributed to this program
    const programLeads = allLeads.filter(l => l.program === name);
    const clients = programLeads.filter(l => l.stage === "client").length;

    // Recent leads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeads = programLeads.filter(l => new Date(l.created_at) >= thirtyDaysAgo).length;

    // Top topics from content_attribution for this program
    const programAttr = allAttribution.filter(a => a.program === name);
    const topicCounts: Record<string, number> = {};
    for (const a of programAttr) {
      const topic = a.video_title || a.tiktok_topic || a.content_category;
      if (topic) topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    programStats[name] = {
      videos: programPosts.length,
      leads: programLeads.length,
      clients,
      conversion: programLeads.length > 0 ? Math.round((clients / programLeads.length) * 100) : 0,
      topTopics,
      topCtas,
      recentLeads,
    };
  }

  // Derived insights
  const byLeads = PROGRAM_NAMES.slice().sort((a, b) => programStats[b].leads - programStats[a].leads);
  const byClients = PROGRAM_NAMES.slice().sort((a, b) => programStats[b].clients - programStats[a].clients);
  const byRecent = PROGRAM_NAMES.slice().sort((a, b) => programStats[b].recentLeads - programStats[a].recentLeads);
  const byVideos = PROGRAM_NAMES.slice().sort((a, b) => programStats[a].videos - programStats[b].videos);

  const totalLeads = allLeads.length;
  const totalClients = allLeads.filter(l => l.stage === "client").length;
  const totalVideos = allPosts.filter(p => parseScriptNotes(p.angle_notes).program).length;

  return NextResponse.json({
    programs: programStats,
    totals: { videos: totalVideos, leads: totalLeads, clients: totalClients },
    topProgram: byLeads[0] ?? null,
    fastestGrowing: byRecent[0] ?? null,
    mostProfitable: byClients[0] ?? null,
    underused: byVideos[0] ?? null,
  });
}
