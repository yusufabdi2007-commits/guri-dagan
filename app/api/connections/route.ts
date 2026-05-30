import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/connections
// Returns all platform connections for the current user.
// Always returns a stable shape — missing platforms get a 'disconnected' default.

const SUPPORTED_PLATFORMS = ["youtube", "tiktok"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", user.id);

  // Build a map keyed by platform so callers always get every platform
  const map: Record<string, Record<string, unknown>> = {};
  for (const row of rows ?? []) {
    map[row.platform] = row;
  }

  const connections = SUPPORTED_PLATFORMS.map((platform) => ({
    platform,
    status: "disconnected",
    channel_id: null,
    channel_name: null,
    last_synced_at: null,
    video_count: 0,
    error_message: null,
    ...(map[platform] ?? {}),
  }));

  return NextResponse.json({ connections });
}
