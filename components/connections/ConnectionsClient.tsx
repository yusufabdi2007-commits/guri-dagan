"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Youtube, Clapperboard, RefreshCw, CheckCircle2, AlertCircle,
  WifiOff, Loader2, Clock, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface PlatformConnection {
  platform: string;
  status: string;
  channel_id: string | null;
  channel_name: string | null;
  last_synced_at: string | null;
  video_count: number;
  error_message: string | null;
}

interface SyncLog {
  platform: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  videos_synced: number;
  videos_created: number;
  error_message: string | null;
}

interface Props {
  youtube: PlatformConnection | null;
  tiktok: PlatformConnection | null;
  syncLogs: SyncLog[];
  youtubeApiConfigured: boolean;
}

export function ConnectionsClient({ youtube, tiktok, syncLogs, youtubeApiConfigured }: Props) {
  const [channelId, setChannelId] = useState(youtube?.channel_id ?? "");
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [localYoutube, setLocalYoutube] = useState(youtube);
  const router = useRouter();

  async function handleSync() {
    if (!channelId.trim() || syncing) return;
    setSyncing(true);

    try {
      const res = await fetch("/api/connections/youtube/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channelId.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error || "Sync failed", variant: "destructive" });
        return;
      }

      setLocalYoutube((prev) => ({
        platform: "youtube",
        status: "connected",
        channel_id: channelId.trim(),
        channel_name: data.channelName ?? prev?.channel_name ?? null,
        last_synced_at: new Date().toISOString(),
        video_count: data.total ?? prev?.video_count ?? 0,
        error_message: null,
      }));

      toast({
        title: "YouTube synced!",
        description: data.message,
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "Network error. Try again.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  const ytStatus = localYoutube?.status ?? "disconnected";
  const ytLogs = syncLogs.filter((l) => l.platform === "youtube");

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">

      {/* YouTube Connection */}
      <Card className={cn(
        "border",
        ytStatus === "connected" && "border-green-200 dark:border-green-800",
        ytStatus === "error" && "border-red-200 dark:border-red-800",
        ytStatus === "disconnected" && "border-border"
      )}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                <Youtube className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">YouTube</p>
                <p className="text-[10px] text-muted-foreground">
                  {localYoutube?.channel_name ?? "Not connected"}
                </p>
              </div>
            </div>
            <StatusBadge status={ytStatus} />
          </div>

          {/* Channel ID input */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Channel ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="UCxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 text-xs bg-muted/50 border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
              <Button
                size="sm"
                onClick={handleSync}
                disabled={!channelId.trim() || syncing || !youtubeApiConfigured}
                className="h-9 px-4 text-xs rounded-xl shrink-0"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">{syncing ? "Syncing..." : "Sync"}</span>
              </Button>
            </div>
            {!youtubeApiConfigured && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Add YOUTUBE_API_KEY to .env.local to enable syncing.
              </p>
            )}
          </div>

          {/* Stats row */}
          {ytStatus === "connected" && localYoutube && (
            <div className="flex items-center gap-4 pt-1 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{localYoutube.video_count}</p>
                <p className="text-[10px] text-muted-foreground">Videos</p>
              </div>
              {localYoutube.last_synced_at && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last synced {formatDistanceToNow(new Date(localYoutube.last_synced_at), { addSuffix: true })}
                </div>
              )}
              <a
                href={`https://www.youtube.com/channel/${localYoutube.channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[11px] text-primary flex items-center gap-1 hover:underline"
              >
                View channel <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {ytStatus === "error" && localYoutube?.error_message && (
            <p className="text-[11px] text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {localYoutube.error_message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* TikTok — manual only */}
      <Card className="border border-border opacity-80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                <Clapperboard className="h-5 w-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">TikTok</p>
                <p className="text-[10px] text-muted-foreground">Manual tracking only</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              Manual
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            TikTok does not provide API access for creator tools. Log your TikTok performance manually in the Tracker.
          </p>
          <a
            href="/tiktok"
            className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-primary font-medium hover:underline"
          >
            Open TikTok Tracker <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {/* Sync History */}
      {ytLogs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <button
              onClick={() => setShowLogs((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <p className="text-xs font-semibold text-foreground">Sync History</p>
              {showLogs
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showLogs && (
              <div className="mt-3 space-y-2">
                {ytLogs.map((log, i) => (
                  <div key={i} className="flex items-start justify-between text-[11px] py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-1.5">
                      {log.status === "success"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        : log.status === "partial"
                        ? <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      <span className="text-foreground capitalize">{log.status}</span>
                      {log.status === "success" && (
                        <span className="text-muted-foreground">
                          · {log.videos_synced} synced, {log.videos_created} new
                        </span>
                      )}
                      {log.error_message && (
                        <span className="text-red-500 truncate max-w-[160px]">{log.error_message}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Future platforms */}
      <Card className="border border-dashed border-border/60 bg-muted/20">
        <CardContent className="p-4 text-center">
          <WifiOff className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-semibold text-muted-foreground">Instagram & Facebook</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Coming in a future phase. Architecture is ready.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Connected
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
        <AlertCircle className="h-3 w-3" /> Error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
      <WifiOff className="h-3 w-3" /> Not connected
    </span>
  );
}
