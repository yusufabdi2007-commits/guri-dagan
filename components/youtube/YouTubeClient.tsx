"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Youtube, RefreshCw, Eye, Heart, MessageCircle, TrendingUp,
  CheckCircle2, AlertCircle, ExternalLink, Trophy, Clock
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

interface Video {
  id: string;
  title: string;
  platform: string;
  status: string;
  url: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  views: number;
  likes: number;
  comments: number;
  youtube_video_id: string | null;
}

interface YouTubeConfig {
  id: string;
  channel_id: string | null;
  channel_name: string | null;
  last_synced_at: string | null;
  sync_enabled: boolean;
}

interface Props {
  videos: Video[];
  config: YouTubeConfig | null;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function YouTubeClient({ videos: initialVideos, config: initialConfig }: Props) {
  const [videos, setVideos] = useState(initialVideos);
  const [config, setConfig] = useState(initialConfig);
  const [channelId, setChannelId] = useState(initialConfig?.channel_id || "");
  const [syncing, setSyncing] = useState(false);
  const [showSetup, setShowSetup] = useState(!initialConfig?.channel_id);

  const youtubeVideos = videos
    .filter(v => v.platform === "YouTube" || v.youtube_video_id)
    .sort((a, b) => (b.views || 0) - (a.views || 0));

  const totalViews = youtubeVideos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = youtubeVideos.reduce((s, v) => s + (v.likes || 0), 0);
  const totalComments = youtubeVideos.reduce((s, v) => s + (v.comments || 0), 0);
  const topVideo = youtubeVideos[0];

  async function handleSync() {
    if (!channelId.trim()) {
      toast({ title: "Enter your Channel ID first", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/youtube-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channelId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Sync failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({
        title: "YouTube synced!",
        description: data.message,
        variant: "success" as never,
      });
      setConfig(prev => ({
        ...(prev || { id: "" }),
        channel_id: channelId,
        channel_name: data.channelName,
        last_synced_at: new Date().toISOString(),
        sync_enabled: true,
      }));
      setShowSetup(false);
      // Reload page to get fresh data
      window.location.reload();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Connection status */}
      <Card className={config?.channel_id ? "border-green-200 dark:border-green-800" : "border-amber-200 dark:border-amber-800"}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                config?.channel_id ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"
              }`}>
                <Youtube className={`h-5 w-5 ${config?.channel_id ? "text-red-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {config?.channel_name || "YouTube Channel"}
                </p>
                {config?.last_synced_at ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    Last synced {format(new Date(config.last_synced_at), "MMM d, h:mm a")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Not connected</p>
                )}
              </div>
            </div>
            {config?.channel_id
              ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            }
          </div>
        </CardContent>
      </Card>

      {/* Setup / Sync panel */}
      {(showSetup || !config?.channel_id) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-500" />
              Connect YouTube Channel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">How to find your Channel ID:</p>
              <p>1. Open YouTube Studio</p>
              <p>2. Settings → Channel → Advanced settings</p>
              <p>3. Copy the &quot;Channel ID&quot; (starts with UC...)</p>
            </div>
            <div className="space-y-2">
              <Label>YouTube Channel ID</Label>
              <Input
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
              />
            </div>
            {!process.env.YOUTUBE_API_KEY && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Setup required:</strong> Add YOUTUBE_API_KEY to your environment variables.
                  Get it from Google Cloud Console → YouTube Data API v3.
                </p>
              </div>
            )}
            <Button onClick={handleSync} disabled={syncing} className="w-full h-11 font-semibold">
              {syncing ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing YouTube data...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sync Channel Now
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Re-sync button when already connected */}
      {config?.channel_id && !showSetup && (
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          className="w-full h-11"
        >
          {syncing ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Syncing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Latest Data
            </span>
          )}
        </Button>
      )}

      {/* Channel stats */}
      {youtubeVideos.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-bold">{fmt(totalViews)}</div>
                <div className="text-[10px] text-muted-foreground">Total Views</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Heart className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-xl font-bold">{fmt(totalLikes)}</div>
                <div className="text-[10px] text-muted-foreground">Total Likes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-xl font-bold">{fmt(totalComments)}</div>
                <div className="text-[10px] text-muted-foreground">Comments</div>
              </CardContent>
            </Card>
          </div>

          {/* Top video */}
          {topVideo && (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">
                      Best Performing Video
                    </p>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{topVideo.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Eye className="h-3 w-3" />{fmt(topVideo.views || 0)}
                      </span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" />{fmt(topVideo.likes || 0)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-purple-400" />{fmt(topVideo.comments || 0)}</span>
                    </div>
                  </div>
                  {topVideo.url && (
                    <a href={topVideo.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              All YouTube Videos ({youtubeVideos.length})
            </h3>
            {youtubeVideos.map(video => (
              <Card key={video.id} className="card-hover">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {video.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-16 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{video.title}</p>
                      {video.posted_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(video.posted_at), "MMM d, yyyy")}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Eye className="h-3 w-3" />{fmt(video.views || 0)}
                        </span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" />{fmt(video.likes || 0)}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-purple-400" />{fmt(video.comments || 0)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {video.status}
                      </Badge>
                      {video.url && (
                        <a href={video.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {youtubeVideos.length === 0 && config?.channel_id && (
        <Card>
          <CardContent className="p-8 text-center">
            <Youtube className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No YouTube videos synced yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click &quot;Sync Channel Now&quot; to import your videos.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
