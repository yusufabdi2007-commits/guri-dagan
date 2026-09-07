import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("academy_chapters")
    .select("id, track_id, academy_tracks!inner(user_id)")
    .eq("id", id)
    .single();
  if (!existing || (existing as unknown as { academy_tracks: { user_id: string } }).academy_tracks.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, body: chapterBody, file_url, zoom_link, zoom_time, week_number } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (chapterBody !== undefined) updates.body = chapterBody;
  if (file_url !== undefined) updates.file_url = file_url;
  if (zoom_link !== undefined) updates.zoom_link = zoom_link;
  if (zoom_time !== undefined) updates.zoom_time = zoom_time;
  if (week_number !== undefined) updates.week_number = week_number;

  const { data: chapter, error } = await supabase
    .from("academy_chapters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chapter });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("academy_chapters")
    .select("id, academy_tracks!inner(user_id)")
    .eq("id", id)
    .single();
  if (!existing || (existing as unknown as { academy_tracks: { user_id: string } }).academy_tracks.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("academy_chapters").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
