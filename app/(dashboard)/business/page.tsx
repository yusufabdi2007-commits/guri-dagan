import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { BusinessDashboardClient } from "@/components/business/BusinessDashboardClient";

export default async function BusinessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: leads }, { data: attribution }, { data: performance }] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_attribution")
      .select("id, lead_id, content_category, youtube_video_id, video_title, tiktok_topic")
      .eq("user_id", user!.id),
    supabase
      .from("content_performance")
      .select("category, views, published_at")
      .eq("user_id", user!.id)
      .eq("platform", "youtube"),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Business Intelligence" subtitle="Content that creates clients" />
      <BusinessDashboardClient
        leads={leads || []}
        attribution={attribution || []}
        performance={performance || []}
      />
    </div>
  );
}
