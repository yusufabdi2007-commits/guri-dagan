import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { TikTokClient } from "@/components/tiktok/TikTokClient";

export default async function TikTokPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("tiktok_posts")
    .select("*")
    .eq("user_id", user!.id)
    .order("posted_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="TikTok Tracker"
        subtitle="Track performance manually"
      />
      <TikTokClient posts={posts || []} userId={user!.id} />
    </div>
  );
}
