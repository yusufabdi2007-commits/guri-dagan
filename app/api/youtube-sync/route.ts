import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; default?: { url: string } };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY is not configured. Add it to your environment variables." },
      { status: 503 }
    );
  }

  try {
    const { channelId } = await req.json();
    if (!channelId?.trim()) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    // 1. Get uploads playlist ID from channel
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`
    );
    const channelData = await channelRes.json();

    if (!channelRes.ok || !channelData.items?.length) {
      return NextResponse.json(
        { error: "Channel not found. Check your Channel ID." },
        { status: 404 }
      );
    }

    const channelName = channelData.items[0]?.snippet?.title || channelId;
    const uploadsPlaylistId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return NextResponse.json({ error: "Could not find uploads playlist" }, { status: 404 });
    }

    // 2. Get latest 50 video IDs from uploads playlist
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
    );
    const playlistData = await playlistRes.json();

    if (!playlistRes.ok) {
      return NextResponse.json({ error: "Failed to fetch playlist items" }, { status: 502 });
    }

    const videoIds: string[] = playlistData.items?.map(
      (item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId
    ) || [];

    if (videoIds.length === 0) {
      return NextResponse.json({ synced: 0, message: "No videos found on channel" });
    }

    // 3. Fetch video statistics in batches of 50
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${apiKey}`
    );
    const statsData = await statsRes.json();

    if (!statsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch video statistics" }, { status: 502 });
    }

    const ytVideos: YouTubeVideoItem[] = statsData.items || [];
    let synced = 0;
    let created = 0;

    // 4. Upsert into videos table
    for (const yt of ytVideos) {
      const views = parseInt(yt.statistics.viewCount) || 0;
      const likes = parseInt(yt.statistics.likeCount) || 0;
      const comments = parseInt(yt.statistics.commentCount) || 0;
      const thumbnail =
        yt.snippet.thumbnails.high?.url ||
        yt.snippet.thumbnails.default?.url ||
        null;

      // Check if video already exists by youtube_video_id
      const { data: existing } = await supabase
        .from("videos")
        .select("id")
        .eq("user_id", user.id)
        .eq("youtube_video_id", yt.id)
        .single();

      if (existing) {
        // Update stats only
        await supabase
          .from("videos")
          .update({ views, likes, comments, thumbnail_url: thumbnail || undefined })
          .eq("id", existing.id);
        synced++;
      } else {
        // Create new video record
        const { error: insertError } = await supabase.from("videos").insert({
          user_id: user.id,
          title: yt.snippet.title,
          platform: "YouTube",
          status: "Posted",
          url: `https://www.youtube.com/watch?v=${yt.id}`,
          thumbnail_url: thumbnail,
          posted_at: yt.snippet.publishedAt,
          views,
          likes,
          comments,
          youtube_video_id: yt.id,
        });
        if (!insertError) created++;
      }
    }

    // 5. Save youtube_config
    await supabase.from("youtube_config").upsert(
      {
        id: user.id,
        channel_id: channelId,
        channel_name: channelName,
        last_synced_at: new Date().toISOString(),
        sync_enabled: true,
      },
      { onConflict: "id" }
    );

    return NextResponse.json({
      synced,
      created,
      total: ytVideos.length,
      channelName,
      message: `Synced ${synced} existing + created ${created} new videos.`,
    });
  } catch (error) {
    console.error("YouTube sync error:", error);
    return NextResponse.json({ error: "YouTube sync failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: config } = await supabase
    .from("youtube_config")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ config: config || null });
}
