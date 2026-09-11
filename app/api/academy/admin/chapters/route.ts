import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Chapters are scoped through their track's user_id (RLS handles ownership),
// but we still verify the track belongs to the caller before inserting.

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trackId = req.nextUrl.searchParams.get("track_id");
  if (!trackId) return NextResponse.json({ error: "track_id is required" }, { status: 400 });

  const { data: chapters, error } = await supabase
    .from("academy_chapters")
    .select("*")
    .eq("track_id", trackId)
    .order("week_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chapters: chapters || [] });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { track_id, week_number, title, body: chapterBody, file_url, zoom_link, zoom_time } = body;

  if (!track_id || !week_number || !title?.trim()) {
    return NextResponse.json({ error: "track_id, week_number and title are required" }, { status: 400 });
  }

  const { data: track } = await supabase
    .from("academy_tracks")
    .select("id")
    .eq("id", track_id)
    .eq("user_id", user.id)
    .single();
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  // Plain insert, not upsert — editing an existing chapter goes through
  // PATCH /api/academy/admin/chapters/[id] (id-scoped, unambiguous). This
  // route only ever creates. Upserting on (track_id, week_number) meant
  // that typing an already-used week number here — easy to do, since the
  // "Add Chapter" dialog always opens with an editable, pre-filled week
  // number — silently overwrote that week's existing title/body/links with
  // no warning, destroying real content instead of erroring.
  const { data: chapter, error } = await supabase
    .from("academy_chapters")
    .insert({
      track_id,
      week_number,
      title: title.trim(),
      body: chapterBody || null,
      file_url: file_url || null,
      zoom_link: zoom_link || null,
      zoom_time: zoom_time || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Week ${week_number} already has a chapter — edit it instead of creating a new one.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ chapter }, { status: 201 });
}
