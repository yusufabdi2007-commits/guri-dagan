import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — fetch the user's content memory (most-used topics)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("content_memory")
      .select("topic, category, platform, hook_used, times_used, last_used_at")
      .eq("user_id", user.id)
      .order("times_used", { ascending: false })
      .limit(30);

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Memory GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST — record a newly used topic/hook
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { topic, category, platform, hook_used, tone_used } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });

    // Check if already exists (case-insensitive fuzzy match)
    const { data: existing } = await supabase
      .from("content_memory")
      .select("id, times_used")
      .eq("user_id", user.id)
      .ilike("topic", topic.trim())
      .single();

    if (existing) {
      // Increment usage count
      await supabase
        .from("content_memory")
        .update({
          times_used: (existing.times_used || 1) + 1,
          last_used_at: new Date().toISOString(),
          hook_used: hook_used || undefined,
        })
        .eq("id", existing.id);
    } else {
      // Create new memory entry
      await supabase.from("content_memory").insert({
        user_id: user.id,
        topic: topic.trim(),
        category: category || null,
        platform: platform || null,
        hook_used: hook_used || null,
        tone_used: tone_used || null,
        times_used: 1,
        last_used_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Memory POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
