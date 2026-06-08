import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ClientDetail } from "@/components/crm/ClientDetail";
import { notFound, redirect } from "next/navigation";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: client }, { data: sessions }, { data: tasks }] = await Promise.all([
    supabase.from("crm_clients").select("*").eq("id", id).eq("user_id", user!.id).single(),
    supabase.from("crm_sessions").select("*").eq("client_id", id).order("session_date", { ascending: false }),
    supabase.from("crm_tasks").select("*").eq("client_id", id).order("due_date", { ascending: true }),
  ]);

  if (!client) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title={client.name} subtitle="Client profile" />
      <ClientDetail client={client} sessions={sessions || []} tasks={tasks || []} userId={user!.id} />
    </div>
  );
}
