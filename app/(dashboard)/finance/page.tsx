import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { FinanceClient } from "@/components/finance/FinanceClient";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("user_id", user!.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Finance" subtitle="Everything the business has made and spent, in one place" />
      <FinanceClient transactions={transactions || []} />
    </div>
  );
}
