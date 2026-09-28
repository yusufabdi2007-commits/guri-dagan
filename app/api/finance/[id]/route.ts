import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.type !== undefined) {
    if (!["income", "expense"].includes(body.type)) {
      return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
    }
    updates.type = body.type;
  }
  if (body.amount !== undefined) {
    const parsedAmount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "amount must be a valid positive number" }, { status: 400 });
    }
    updates.amount = parsedAmount;
  }
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.category !== undefined) updates.category = body.category?.trim() || "Other";
  if (body.client_name !== undefined) updates.client_name = body.client_name?.trim() || null;
  if (body.transaction_date !== undefined) updates.transaction_date = body.transaction_date;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  const { data, error } = await supabase
    .from("finance_transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  return NextResponse.json({ transaction: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
