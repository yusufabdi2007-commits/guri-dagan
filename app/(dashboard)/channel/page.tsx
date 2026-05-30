import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ChannelClient } from "@/components/channel/ChannelClient";

export default async function ChannelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    { data: videos },
    { data: recordingQueue },
    { data: hookScores },
    { data: completionsWeek },
    { data: completionsMonth },
    { data: tiktokPosts },
  ] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, status, platform, posted_at, recorded_at, edited_at, notes, url, thumbnail_url, views, likes, saves")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("recording_queue")
      .select("id, title, status, priority_order, filming_notes")
      .eq("user_id", user!.id)
      .order("priority_order", { ascending: true }),
    supabase
      .from("hook_scores")
      .select("hook_text, scores, verdict")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user!.id)
      .gte("completed_date", weekAgoStr),
    supabase
      .from("daily_completions")
      .select("completed_date")
      .eq("user_id", user!.id)
      .gte("completed_date", monthAgoStr),
    supabase
      .from("tiktok_posts")
      .select("emotional_tag, views, likes, saves")
      .eq("user_id", user!.id)
      .order("posted_at", { ascending: false })
      .limit(50),
  ]);

  const uniqueWeek = new Set((completionsWeek ?? []).map(c => c.completed_date.split("T")[0])).size;
  const uniqueMonth = new Set((completionsMonth ?? []).map(c => c.completed_date.split("T")[0])).size;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Channel Dashboard" subtitle="Creator operations command center" />
      <ChannelClient
        videos={videos ?? []}
        recordingQueue={recordingQueue ?? []}
        hookScores={hookScores ?? []}
        completionsThisWeek={uniqueWeek}
        completionsThisMonth={uniqueMonth}
        tiktokPosts={tiktokPosts ?? []}
      />
    </div>
  );
}
