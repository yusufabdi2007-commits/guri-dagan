import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mirrorPaidPaymentToFinance } from "@/lib/finance";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.payment_status !== undefined) {
    if (!["paid", "pending", "refunded"].includes(body.payment_status)) {
      return NextResponse.json({ error: "payment_status must be paid, pending, or refunded" }, { status: 400 });
    }
    updates.payment_status = body.payment_status;
  }
  if (body.amount !== undefined) {
    const parsed = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "amount must be a valid positive number" }, { status: 400 });
    }
    updates.amount = parsed;
  }
  if (body.payment_date !== undefined) updates.payment_date = body.payment_date;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, client_enrollments(id, parent_name, program)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  let transaction = null;
  if (data.payment_status === "paid") {
    const enrollment = Array.isArray(data.client_enrollments) ? data.client_enrollments[0] : data.client_enrollments;
    await mirrorPaidPaymentToFinance(supabase, {
      userId: user.id,
      paymentId: data.id,
      enrollmentId: data.enrollment_id,
      amount: data.amount,
      currency: data.currency,
      category: enrollment?.program || "Coaching",
      clientName: enrollment?.parent_name || "Client",
      date: data.payment_date,
      notes: data.notes,
    });
    const { data: mirrored } = await supabase
      .from("finance_transactions")
      .select("*")
      .eq("payment_id", data.id)
      .maybeSingle();
    transaction = mirrored;
  }

  return NextResponse.json({ payment: data, transaction });
}
