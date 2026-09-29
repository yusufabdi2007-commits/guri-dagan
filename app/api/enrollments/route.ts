import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { mirrorPaidPaymentToFinance } from "@/lib/finance";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("client_enrollments")
    .select(`
      *,
      leads(id, name, phone, email, source, program),
      payments(id, amount, currency, payment_date, payment_status),
      testimonial_requests(id, status, requested_at, received_at)
    `)
    .eq("user_id", user.id)
    .order("enrollment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 60, windowMs: 3600000 }).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lead_id, parent_name, child_name, program, enrollment_date, notes, region, payments: paymentsInput } = body;

  if (!parent_name?.trim()) {
    return NextResponse.json({ error: "parent_name is required" }, { status: 400 });
  }

  if (region && !["africa_arab", "other"].includes(region)) {
    return NextResponse.json({ error: "region must be africa_arab or other" }, { status: 400 });
  }

  // Optional list of payments to create alongside the enrollment — supports
  // a single paid-in-full payment, or a split like "$30 now, $20 pending on
  // the 1st" as two entries with different amounts/dates/statuses.
  type PaymentInput = { amount: number; currency: string; payment_date: string; payment_status: "paid" | "pending" };
  const paymentsToCreate: PaymentInput[] = [];
  if (Array.isArray(paymentsInput)) {
    for (const p of paymentsInput) {
      const parsed = typeof p.amount === "number" ? p.amount : parseFloat(p.amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "each payment.amount must be a valid positive number" }, { status: 400 });
      }
      const status = p.payment_status === "pending" ? "pending" : "paid";
      paymentsToCreate.push({
        amount: parsed,
        currency: p.currency || "USD",
        payment_date: p.payment_date || new Date().toISOString().split("T")[0],
        payment_status: status,
      });
    }
  }

  if (lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", lead_id)
      .eq("user_id", user.id)
      .single();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("client_enrollments")
    .insert({
      user_id: user.id,
      lead_id: lead_id || null,
      parent_name: parent_name.trim(),
      child_name: child_name?.trim() || null,
      program: program || null,
      enrollment_date: enrollment_date || new Date().toISOString().split("T")[0],
      notes: notes || null,
      status: "active",
      region: region || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional one-shot payment(s): creates the payment row(s) (feeds /revenue)
  // and mirrors any already-"paid" ones into the finance ledger (feeds
  // /finance) in the same request. A "pending" entry (e.g. the rest due on
  // the 1st) is created but only counted as income once it's later marked paid.
  const createdPayments = [];
  for (const p of paymentsToCreate) {
    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        enrollment_id: data.id,
        amount: p.amount,
        currency: p.currency,
        payment_date: p.payment_date,
        payment_status: p.payment_status,
        notes: notes || null,
      })
      .select()
      .single();

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });
    createdPayments.push(paymentRow);

    if (p.payment_status === "paid") {
      await mirrorPaidPaymentToFinance(supabase, {
        userId: user.id,
        paymentId: paymentRow.id,
        enrollmentId: data.id,
        amount: p.amount,
        currency: p.currency,
        category: program || "Coaching",
        clientName: parent_name.trim(),
        date: p.payment_date,
        notes: region ? `Region: ${region === "africa_arab" ? "Africa/Arab" : "Other"}` : null,
      });
    }
  }
  const payment = createdPayments[0] ?? null;

  // If linked to a lead, update lead stage to 'client'
  if (lead_id) {
    const { data: currentLead } = await supabase
      .from("leads")
      .select("stage")
      .eq("id", lead_id)
      .eq("user_id", user.id)
      .single();

    await supabase.from("leads").update({ stage: "client" }).eq("id", lead_id).eq("user_id", user.id);
    await supabase.from("lead_activity").insert({
      lead_id,
      user_id: user.id,
      activity_type: "stage_changed",
      from_stage: currentLead?.stage ?? null,
      to_stage: "client",
      note: `Enrolled in ${program || "program"}`,
    });
  }

  // Auto-create child profile if child_name provided
  if (child_name?.trim()) {
    const { data: childProfile } = await supabase
      .from("child_profiles")
      .insert({
        user_id: user.id,
        enrollment_id: data.id,
        child_name: child_name.trim(),
        program: program || null,
        start_date: enrollment_date || new Date().toISOString().split("T")[0],
        status: "active",
      })
      .select()
      .single();

    // Auto-create starter goals aligned to the program
    if (childProfile) {
      const starterGoals = [
        { category: "confidence", goal_title: "Build self-confidence and self-belief", target_score: 8 },
        { category: "communication", goal_title: "Improve communication with parents", target_score: 7 },
        { category: "emotional_regulation", goal_title: "Manage emotions in difficult situations", target_score: 7 },
        { category: "resilience", goal_title: "Bounce back from setbacks", target_score: 8 },
      ];
      await supabase.from("child_goals").insert(
        starterGoals.map(g => ({
          user_id: user.id,
          child_id: childProfile.id,
          ...g,
          current_score: 3,
          achieved: false,
        }))
      );
    }
  }

  return NextResponse.json({ enrollment: data, payment, payments: createdPayments }, { status: 201 });
}
