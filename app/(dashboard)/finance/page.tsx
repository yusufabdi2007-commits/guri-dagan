import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { FinanceClient } from "@/components/finance/FinanceClient";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: transactions }, { data: pendingPayments }] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select("*")
      .eq("user_id", user!.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, enrollment_id, client_enrollments(parent_name, program)")
      .eq("user_id", user!.id)
      .eq("payment_status", "pending")
      .order("payment_date", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Finance" subtitle="Everything the business has made and spent, in one place" />
      <FinanceClient
        transactions={transactions || []}
        pendingPayments={(pendingPayments || []).map(p => ({
          ...p,
          client_enrollments: Array.isArray(p.client_enrollments) ? (p.client_enrollments[0] ?? null) : p.client_enrollments,
        }))}
      />
    </div>
  );
}
