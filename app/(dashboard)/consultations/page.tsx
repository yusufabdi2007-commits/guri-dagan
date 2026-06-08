import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ConsultationsClient } from "@/components/consultations/ConsultationsClient";

export default async function ConsultationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: consultations }, { data: leads }] = await Promise.all([
    supabase
      .from("consultations")
      .select("*, leads(id, name, phone, email, program, source)")
      .eq("user_id", user!.id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, name, phone, email, program, source, stage")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Consultations" subtitle="Track and manage consultation calls" />
      <ConsultationsClient
        consultations={consultations || []}
        leads={leads || []}
      />
    </div>
  );
}
