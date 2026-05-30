import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { LeadPipelineClient } from "@/components/leads/LeadPipelineClient";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: leads } = await supabase
    .from("leads")
    .select("*, content_attribution(id, content_category, youtube_video_id, video_title, tiktok_topic)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Lead Pipeline" subtitle="Track every inquiry to client" />
      <LeadPipelineClient leads={leads || []} userId={user!.id} />
    </div>
  );
}
