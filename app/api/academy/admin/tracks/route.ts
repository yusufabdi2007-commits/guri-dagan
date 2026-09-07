import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tracks, error } = await supabase
    .from("academy_tracks")
    .select("*, academy_chapters(id)")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tracks: tracks || [] });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, age_range, total_weeks, price_amount, price_currency, sort_order, weeks_per_payment } = body;

  if (!name?.trim() || !age_range?.trim()) {
    return NextResponse.json({ error: "Name and age range are required" }, { status: 400 });
  }

  const { data: track, error } = await supabase
    .from("academy_tracks")
    .insert({
      user_id: user.id,
      name: name.trim(),
      age_range: age_range.trim(),
      total_weeks: total_weeks || 8,
      price_amount: price_amount ?? 40,
      price_currency: price_currency || "USD",
      sort_order: sort_order ?? 0,
      weeks_per_payment: weeks_per_payment || 4,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track }, { status: 201 });
}
