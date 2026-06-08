import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { LeadDetailClient } from "@/components/leads/LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: lead }, { data: activity }, { data: attribution }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).eq("user_id", user!.id).single(),
    supabase.from("lead_activity").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("content_attribution").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);

  if (!lead) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title={lead.name} subtitle="Lead details & content attribution" />
      <LeadDetailClient lead={lead} activity={activity || []} attribution={attribution || []} />
    </div>
  );
}
