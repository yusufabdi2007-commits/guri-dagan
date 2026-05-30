import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { fetchSafe } from "@/lib/fetch-safe";
import OpenAI from "openai";

export const maxDuration = 60;

// The 7 canonical content categories for Somali parenting content
const CATEGORIES = [
  "Parenting Communication",
  "Discipline",
  "Emotional Regulation",
  "Islamic Parenting",
  "Family Relationships",
  "Child Development",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

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

// Classify video titles into categories using GPT-4o-mini in a single batch call.
// Returns an array of categories in the same order as the input titles.
// Falls back to "Other" for any item if the call fails.
async function classifyTitles(titles: string[]): Promise<Category[]> {
  if (titles.length === 0) return [];

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content: `You classify Somali parenting video titles into one of these categories:
${CATEGORIES.join(" | ")}

Return JSON: { "categories": ["Cat1", "Cat2", ...] }
Array must match input length exactly. Default to "Other" when unsure.`,
          },
          {
            role: "user",
            content: `Classify these ${titles.length} video titles:\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
          },
        ],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Classify timeout")), 12_000)),
    ]);

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    const result: Category[] = Array.isArray(parsed.categories) ? parsed.categories : [];

    // Validate each entry — fall back to "Other" if not a valid category
    return titles.map((_, i) => {
      const c = result[i];
      return (CATEGORIES as readonly string[]).includes(c) ? (c as Category) : "Other";
    });
  } catch {
    return titles.map(() => "Other");
  }
}

// POST /api/connections/youtube/sync
// Requires: { channelId: string } in body
export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY is not configured. Add it to .env.local." },
      { status: 503 }
    );
  }

  // Start sync log
  const { data: syncLog } = await supabase
    .from("sync_logs")
    .insert({
      user_id: user.id,
      platform: "youtube",
      status: "running",
    })
    .select("id")
    .single();
  const syncLogId = syncLog?.id;

  const finishLog = async (
    status: "success" | "error" | "partial",
    counts: { videos_synced?: number; videos_created?: number },
    error_message?: string
  ) => {
    if (!syncLogId) return;
    await supabase
      .from("sync_logs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        videos_synced: counts.videos_synced ?? 0,
        videos_created: counts.videos_created ?? 0,
        error_message: error_message ?? null,
      })
      .eq("id", syncLogId);
  };

  try {
    const { channelId } = await req.json();
    if (!channelId?.trim()) {
      await finishLog("error", {}, "channelId is required");
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    // 1. Get channel info and uploads playlist ID
    const channelRes = await fetchSafe<{ items?: { snippet?: { title?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] }>(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`,
      { timeoutMs: 12_000, retries: 2 }
    );

    if (channelRes.error || !channelRes.data?.items?.length) {
      const msg = channelRes.error || "Channel not found. Check your Channel ID.";
      await finishLog("error", {}, msg);
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    const channelItem = channelRes.data.items[0];
    const channelName = channelItem?.snippet?.title || channelId;
    const uploadsPlaylistId = channelItem?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      await finishLog("error", {}, "Could not find uploads playlist");
      return NextResponse.json({ error: "Could not find uploads playlist" }, { status: 404 });
    }

    // 2. Fetch up to 50 video IDs from uploads playlist
    const playlistRes = await fetchSafe<{ items?: { contentDetails?: { videoId?: string } }[] }>(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`,
      { timeoutMs: 12_000, retries: 2 }
    );

    if (playlistRes.error) {
      await finishLog("error", {}, playlistRes.error);
      return NextResponse.json({ error: "Failed to fetch playlist" }, { status: 502 });
    }

    const videoIds: string[] = (playlistRes.data?.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean) as string[];

    if (videoIds.length === 0) {
      await finishLog("success", { videos_synced: 0 });
      return NextResponse.json({ synced: 0, created: 0, total: 0, channelName, message: "No videos found." });
    }

    // 3. Fetch video stats in one batch
    const statsRes = await fetchSafe<{ items?: YouTubeVideoItem[] }>(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${apiKey}`,
      { timeoutMs: 15_000, retries: 2 }
    );

    if (statsRes.error) {
      await finishLog("error", {}, statsRes.error);
      return NextResponse.json({ error: "Failed to fetch video statistics" }, { status: 502 });
    }

    const ytVideos: YouTubeVideoItem[] = statsRes.data?.items ?? [];

    // 4. Classify all video titles in one GPT call
    const titles = ytVideos.map((v) => v.snippet.title);
    const categories = await classifyTitles(titles);

    // 5. Upsert into content_performance and videos tables
    let synced = 0;
    let created = 0;

    for (let i = 0; i < ytVideos.length; i++) {
      const yt = ytVideos[i];
      const views = parseInt(yt.statistics.viewCount) || 0;
      const likes = parseInt(yt.statistics.likeCount) || 0;
      const comments = parseInt(yt.statistics.commentCount) || 0;
      const thumbnail =
        yt.snippet.thumbnails.high?.url || yt.snippet.thumbnails.default?.url || null;
      const category = categories[i] ?? "Other";

      // Upsert into content_performance (the new intelligence table)
      await supabase.from("content_performance").upsert(
        {
          user_id: user.id,
          platform: "youtube",
          external_id: yt.id,
          title: yt.snippet.title,
          category,
          views,
          likes,
          comments,
          published_at: yt.snippet.publishedAt,
          synced_at: new Date().toISOString(),
          thumbnail_url: thumbnail,
        },
        { onConflict: "user_id,platform,external_id" }
      );

      // Also keep the legacy videos table in sync
      const { data: existing } = await supabase
        .from("videos")
        .select("id")
        .eq("user_id", user.id)
        .eq("youtube_video_id", yt.id)
        .single();

      if (existing) {
        await supabase
          .from("videos")
          .update({ views, likes, comments, thumbnail_url: thumbnail ?? undefined })
          .eq("id", existing.id);
        synced++;
      } else {
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

    // 6. Update platform_connections
    await supabase.from("platform_connections").upsert(
      {
        user_id: user.id,
        platform: "youtube",
        status: "connected",
        channel_id: channelId,
        channel_name: channelName,
        last_synced_at: new Date().toISOString(),
        video_count: ytVideos.length,
        error_message: null,
      },
      { onConflict: "user_id,platform" }
    );

    // 7. Also keep youtube_config in sync for backward compatibility
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

    await finishLog("success", { videos_synced: synced, videos_created: created });

    return NextResponse.json({
      synced,
      created,
      total: ytVideos.length,
      channelName,
      message: `Synced ${synced} + created ${created} new videos with categories.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "YouTube sync failed";
    console.error("YouTube intelligence sync error:", error);
    await finishLog("error", {}, msg);

    // Mark platform_connections as error
    await supabase.from("platform_connections").upsert(
      {
        user_id: user.id,
        platform: "youtube",
        status: "error",
        error_message: msg,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
