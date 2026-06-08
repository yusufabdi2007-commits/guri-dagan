import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: completions },
    { data: ideas },
    { data: videos },
    { data: performance },
    { data: attribution },
    { data: leads },
  ] = await Promise.all([
    supabase.from("daily_completions").select("*").eq("user_id", user!.id).order("completed_date", { ascending: false }),
    supabase.from("content_ideas").select("platform, category, status, created_at").eq("user_id", user!.id),
    supabase.from("videos").select("platform, status, posted_at, created_at").eq("user_id", user!.id),
    supabase
      .from("content_performance")
      .select("category, views, likes, comments, published_at, platform")
      .eq("user_id", user!.id)
      .eq("platform", "youtube")
      .order("published_at", { ascending: false }),
    supabase
      .from("content_attribution")
      .select("lead_id, content_category")
      .eq("user_id", user!.id),
    supabase
      .from("leads")
      .select("id, stage")
      .eq("user_id", user!.id),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Analytics" subtitle="Your impact at a glance" />
      <AnalyticsClient
        completions={completions || []}
        ideas={ideas || []}
        videos={videos || []}
        performance={performance || []}
        attribution={attribution || []}
        leads={leads || []}
      />
    </div>
  );
}
