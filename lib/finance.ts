import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mirrors a paid payment into the finance ledger. Idempotent on payment_id —
 * safe to call every time a payment is created or flipped to "paid" without
 * risking a duplicate ledger row (e.g. a pending payment later marked paid).
 */
export async function mirrorPaidPaymentToFinance(
  supabase: SupabaseClient,
  params: {
    userId: string;
    paymentId: string;
    enrollmentId: string;
    amount: number;
    currency: string;
    category: string;
    clientName: string;
    date: string;
    notes?: string | null;
  }
) {
  const { data: existing } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("payment_id", params.paymentId)
    .maybeSingle();
  if (existing) return;

  await supabase.from("finance_transactions").insert({
    user_id: params.userId,
    type: "income",
    amount: params.amount,
    currency: params.currency,
    category: params.category,
    client_name: params.clientName,
    enrollment_id: params.enrollmentId,
    payment_id: params.paymentId,
    transaction_date: params.date,
    notes: params.notes ?? null,
  });
}
