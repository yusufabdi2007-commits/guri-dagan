import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { VideosClient } from "@/components/videos/VideosClient";

export default async function VideosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Video Tracker" subtitle="Track all your videos" />
      <VideosClient videos={videos || []} userId={user!.id} />
    </div>
  );
}
