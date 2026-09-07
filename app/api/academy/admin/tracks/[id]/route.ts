import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, age_range, total_weeks, price_amount, price_currency, sort_order, is_active, weeks_per_payment } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (age_range !== undefined) updates.age_range = age_range;
  if (total_weeks !== undefined) updates.total_weeks = total_weeks;
  if (price_amount !== undefined) updates.price_amount = price_amount;
  if (price_currency !== undefined) updates.price_currency = price_currency;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (is_active !== undefined) updates.is_active = is_active;
  if (weeks_per_payment !== undefined) updates.weeks_per_payment = weeks_per_payment;

  const { data: track, error } = await supabase
    .from("academy_tracks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await supabase
    .from("academy_students")
    .select("id", { count: "exact", head: true })
    .eq("track_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `This track has ${count} enrolled student${count === 1 ? "" : "s"}. Deactivate it instead of deleting so their records and access aren't lost.` },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("academy_tracks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
