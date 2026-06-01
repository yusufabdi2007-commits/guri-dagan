import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const childId = req.nextUrl.searchParams.get("child_id");
  let query = supabase
    .from("milestones")
    .select("*, child_profiles(id, child_name, program)")
    .eq("user_id", user.id)
    .order("achieved_at", { ascending: false });

  if (childId) query = query.eq("child_id", childId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip, 60, 3600)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { child_id, title, description, category, achieved_at } = body;

  if (!child_id) return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("milestones")
    .insert({
      user_id: user.id,
      child_id,
      title: title.trim(),
      description: description || null,
      category: category || "general",
      achieved_at: achieved_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestone: data }, { status: 201 });
}
