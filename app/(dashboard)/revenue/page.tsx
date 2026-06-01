import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { RevenueClient } from "@/components/revenue/RevenueClient";

export default async function RevenuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: payments }, { data: enrollments }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, payment_status, enrollment_id, client_enrollments(id, parent_name, child_name, program, status)")
      .eq("user_id", user!.id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("client_enrollments")
      .select("id, parent_name, child_name, program, status, enrollment_date")
      .eq("user_id", user!.id),
  ]);

  const allPayments = payments || [];
  const allEnrollments = enrollments || [];

  const paidPayments = allPayments.filter(p => p.payment_status === "paid");
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const activeClients = allEnrollments.filter(e => e.status === "active").length;
  const avgRevenue = activeClients > 0 ? Math.round(totalRevenue / allEnrollments.filter(e => e.status !== "cancelled").length) : 0;

  // Revenue by program
  const programRevenue: Record<string, number> = {};
  for (const payment of paidPayments) {
    const prog = (payment.client_enrollments as { program?: string | null } | null)?.program ?? "Unknown";
    programRevenue[prog] = (programRevenue[prog] || 0) + payment.amount;
  }

  // Revenue by month (last 6 months)
  const monthRevenue: Record<string, number> = {};
  for (const payment of paidPayments) {
    const month = payment.payment_date.slice(0, 7); // YYYY-MM
    monthRevenue[month] = (monthRevenue[month] || 0) + payment.amount;
  }
  const sortedMonths = Object.entries(monthRevenue)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .reverse();

  // Revenue by client (top 5)
  const clientRevenue: Record<string, { name: string; amount: number; program: string | null }> = {};
  for (const payment of paidPayments) {
    const rawEnr = payment.client_enrollments;
    const enr = (Array.isArray(rawEnr) ? rawEnr[0] : rawEnr) as { id: string; parent_name: string; program: string | null } | null;
    if (!enr) continue;
    if (!clientRevenue[enr.id]) {
      clientRevenue[enr.id] = { name: enr.parent_name, amount: 0, program: enr.program };
    }
    clientRevenue[enr.id].amount += payment.amount;
  }
  const topClients = Object.entries(clientRevenue)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
    .map(([id, data]) => ({ id, ...data }));

  const highestProgram = Object.entries(programRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Revenue" subtitle="Program and client revenue intelligence" />
      <RevenueClient
        totalRevenue={totalRevenue}
        activeClients={activeClients}
        avgRevenue={avgRevenue}
        highestProgram={highestProgram}
        programRevenue={programRevenue}
        monthlyRevenue={sortedMonths}
        topClients={topClients}
        recentPayments={allPayments.slice(0, 10).map(p => ({ ...p, client_enrollments: Array.isArray(p.client_enrollments) ? (p.client_enrollments[0] ?? null) : p.client_enrollments }))}
      />
    </div>
  );
}
