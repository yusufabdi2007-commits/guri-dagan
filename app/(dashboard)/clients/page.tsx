import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ClientsListClient } from "@/components/clients/ClientsListClient";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: enrollments } = await supabase
    .from("client_enrollments")
    .select(`
      *,
      leads(id, name, phone, email, source, program),
      payments(id, amount, currency, payment_date, payment_status),
      testimonial_requests(id, status, requested_at, received_at)
    `)
    .eq("user_id", user!.id)
    .order("enrollment_date", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Clients" subtitle="Enrolled clients and program status" />
      <ClientsListClient enrollments={enrollments || []} />
    </div>
  );
}
