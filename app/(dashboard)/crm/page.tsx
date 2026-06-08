import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CrmClient } from "@/components/crm/CrmClient";

export default async function CrmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: clients }, { data: tasks }] = await Promise.all([
    supabase.from("crm_clients").select("*, crm_sessions(count)").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("crm_tasks").select("*").eq("user_id", user!.id).eq("completed", false).order("due_date", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Client CRM" subtitle="Your coaching relationships" />
      <CrmClient clients={clients || []} pendingTasks={tasks || []} userId={user!.id} />
    </div>
  );
}
