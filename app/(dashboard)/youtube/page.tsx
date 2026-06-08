import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { YouTubeClient } from "@/components/youtube/YouTubeClient";

export default async function YouTubePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: videos }, { data: config }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, platform, status, url, thumbnail_url, posted_at, views, likes, comments, youtube_video_id")
      .eq("user_id", user!.id)
      .order("views", { ascending: false }),
    supabase
      .from("youtube_config")
      .select("*")
      .eq("id", user!.id)
      .single(),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="YouTube Analytics"
        subtitle="Sync real performance data"
      />
      <YouTubeClient videos={videos || []} config={config || null} />
    </div>
  );
}
