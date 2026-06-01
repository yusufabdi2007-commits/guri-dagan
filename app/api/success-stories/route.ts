import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("success_stories")
    .select("*, child_profiles(id, child_name, age, program)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
  const { child_id, title, story, status } = body;

  if (!child_id) return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("success_stories")
    .insert({
      user_id: user.id,
      child_id,
      title: title.trim(),
      story: story || null,
      status: status || "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ story: data }, { status: 201 });
}
