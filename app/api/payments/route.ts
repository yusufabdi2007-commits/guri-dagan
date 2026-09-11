import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("payments")
    .select("*, client_enrollments(id, parent_name, child_name, program, status)")
    .eq("user_id", user.id)
    .order("payment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 60, windowMs: 3600000 }).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { enrollment_id, amount, currency = "GBP", payment_date, payment_status = "paid", notes } = body;

  const parsedAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (!enrollment_id || !amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "enrollment_id and a valid positive amount are required" }, { status: 400 });
  }

  const { data: enrollment } = await supabase
    .from("client_enrollments")
    .select("id")
    .eq("id", enrollment_id)
    .eq("user_id", user.id)
    .single();
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      enrollment_id,
      amount: parsedAmount,
      currency,
      payment_date: payment_date || new Date().toISOString().split("T")[0],
      payment_status,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data }, { status: 201 });
}
