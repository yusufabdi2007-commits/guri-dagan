import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 60, windowMs: 3600000 }).ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, amount, currency = "USD", category, client_name, transaction_date, notes } = body;

  const parsedAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (!["income", "expense"].includes(type)) {
    return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "amount must be a valid positive number" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: user.id,
      type,
      amount: parsedAmount,
      currency,
      category: category?.trim() || "Other",
      client_name: client_name?.trim() || null,
      transaction_date: transaction_date || new Date().toISOString().split("T")[0],
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: data }, { status: 201 });
}
