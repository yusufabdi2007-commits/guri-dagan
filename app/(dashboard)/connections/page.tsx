import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ConnectionsClient } from "@/components/connections/ConnectionsClient";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: connections }, { data: ytConfig }, { data: syncLogs }] = await Promise.all([
    supabase
      .from("platform_connections")
      .select("*")
      .eq("user_id", user!.id),
    supabase
      .from("youtube_config")
      .select("channel_id, channel_name, last_synced_at")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("sync_logs")
      .select("platform, started_at, completed_at, status, videos_synced, videos_created, error_message")
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  // Build a stable connection map — fall back to youtube_config for channel info
  const youtubeConn = connections?.find((c) => c.platform === "youtube") ?? null;
  const tiktokConn = connections?.find((c) => c.platform === "tiktok") ?? null;

  // If we have youtube_config but not platform_connections yet, seed from youtube_config
  const effectiveYoutube = youtubeConn ?? (ytConfig
    ? {
        platform: "youtube",
        status: "connected",
        channel_id: ytConfig.channel_id,
        channel_name: ytConfig.channel_name,
        last_synced_at: ytConfig.last_synced_at,
        video_count: 0,
        error_message: null,
      }
    : null);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Platform Connections"
        subtitle="Connect your channels and sync real performance data"
      />
      <ConnectionsClient
        youtube={effectiveYoutube}
        tiktok={tiktokConn}
        syncLogs={syncLogs ?? []}
        youtubeApiConfigured={!!process.env.YOUTUBE_API_KEY}
      />
    </div>
  );
}
