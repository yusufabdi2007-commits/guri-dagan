import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ClientDetailClient } from "@/components/clients/ClientDetailClient";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: enrollment, error } = await supabase
    .from("client_enrollments")
    .select(`
      *,
      leads(id, name, phone, email, source, program, stage, notes),
      payments(id, amount, currency, payment_date, payment_status, notes),
      testimonial_requests(id, status, requested_at, received_at)
    `)
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (error || !enrollment) return notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title={enrollment.parent_name} subtitle={enrollment.program ?? "Client Profile"} />
      <ClientDetailClient enrollment={enrollment} />
    </div>
  );
}
