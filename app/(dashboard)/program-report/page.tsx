import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ProgramReportClient } from "@/components/program-report/ProgramReportClient";
import { parseScriptNotes } from "@/lib/programs";

const PROGRAM_NAMES = ["MePower™", "Inner Power™", "MindPower™", "DreamPower™", "Slaying Dragons™"] as const;

export default async function ProgramReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: leads }, { data: batchPosts }, { data: attribution }] = await Promise.all([
    supabase.from("leads").select("id, program, stage, created_at, source").eq("user_id", user!.id),
    supabase.from("batch_posts").select("id, angle_notes, title, scheduled_date").eq("user_id", user!.id),
    supabase.from("content_attribution").select("id, program, video_title, tiktok_topic, content_category").eq("user_id", user!.id),
  ]);

  const allLeads = leads || [];
  const allPosts = batchPosts || [];
  const allAttribution = attribution || [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const programStats: Record<string, {
    videos: number;
    leads: number;
    clients: number;
    conversion: number;
    topTopics: string[];
    recentLeads: number;
  }> = {};

  for (const name of PROGRAM_NAMES) {
    const programPosts = allPosts.filter(p => parseScriptNotes(p.angle_notes).program === name);
    const programLeads = allLeads.filter(l => l.program === name);
    const clients = programLeads.filter(l => l.stage === "client").length;
    const recentLeads = programLeads.filter(l => new Date(l.created_at) >= thirtyDaysAgo).length;

    const programAttr = allAttribution.filter(a => a.program === name);
    const topicCounts: Record<string, number> = {};
    for (const a of programAttr) {
      const topic = a.video_title || a.tiktok_topic || a.content_category;
      if (topic) topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }

    programStats[name] = {
      videos: programPosts.length,
      leads: programLeads.length,
      clients,
      conversion: programLeads.length > 0 ? Math.round((clients / programLeads.length) * 100) : 0,
      topTopics: Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t),
      recentLeads,
    };
  }

  const byLeads = PROGRAM_NAMES.slice().sort((a, b) => programStats[b].leads - programStats[a].leads);
  const byClients = PROGRAM_NAMES.slice().sort((a, b) => programStats[b].clients - programStats[a].clients);
  const byRecent = PROGRAM_NAMES.slice().sort((a, b) => programStats[b].recentLeads - programStats[a].recentLeads);
  const byVideos = PROGRAM_NAMES.slice().sort((a, b) => programStats[a].videos - programStats[b].videos);

  const totalLeads = allLeads.length;
  const totalClients = allLeads.filter(l => l.stage === "client").length;
  const totalVideos = allPosts.filter(p => parseScriptNotes(p.angle_notes).program).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Program Report" subtitle="Weekly program performance analysis" />
      <ProgramReportClient
        programs={programStats}
        totals={{ videos: totalVideos, leads: totalLeads, clients: totalClients }}
        topProgram={byLeads[0] ?? null}
        fastestGrowing={byRecent[0] ?? null}
        mostProfitable={byClients[0] ?? null}
        underused={byVideos[0] ?? null}
      />
    </div>
  );
}
