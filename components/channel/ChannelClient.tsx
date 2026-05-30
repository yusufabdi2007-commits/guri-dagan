"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity, AlertCircle, CheckCircle2, Clock,
  Film, GitBranch, TrendingUp, Video, Zap,
  BarChart3, Brain, ArrowRight, Edit3, Upload,
  Eye, Play, Layers, Calendar, Package,
  ChevronRight, Circle, AlertTriangle, ScanSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VideoItem {
  id: string;
  title: string;
  status: string;
  platform: string;
  posted_at?: string;
  recorded_at?: string;
  edited_at?: string;
  notes?: string;
  url?: string;
  thumbnail_url?: string;
  views?: number;
  likes?: number;
  saves?: number;
}

interface QueueItem {
  id: string;
  title: string;
  status: string;
  priority_order: number;
  filming_notes?: string;
}

interface HookScore {
  hook_text: string;
  scores: Record<string, number>;
  verdict: string;
}

interface TikTokPost {
  emotional_tag: string;
  views: number;
  likes: number;
  saves: number;
}

interface Props {
  videos: VideoItem[];
  recordingQueue: QueueItem[];
  hookScores: HookScore[];
  completionsThisWeek: number;
  completionsThisMonth: number;
  tiktokPosts: TikTokPost[];
}

const PIPELINE_COLUMNS = [
  { status: "Recorded", label: "Recorded", icon: Play, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { status: "Editing", label: "Editing", icon: Edit3, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { status: "Edited", label: "Ready", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { status: "Posted", label: "Published", icon: Upload, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
];

const QUICK_ACTIONS = [
  { label: "Pipeline", href: "/pipeline", icon: GitBranch, desc: "Start content flow" },
  { label: "Record Queue", href: "/queue", icon: Film, desc: "Plan recordings" },
  { label: "Review Mode", href: "/videos", icon: ScanSearch, desc: "QA before export" },
  { label: "Hook Scorer", href: "/hook-scorer", icon: Zap, desc: "Score your hooks" },
  { label: "Repurpose", href: "/repurpose", icon: Layers, desc: "Expand content" },
  { label: "Strategist", href: "/strategist", icon: Brain, desc: "Get AI strategy" },
];

function getThroughputScore(
  postedThisWeek: number,
  queueCount: number,
  editedCount: number,
  inProductionCount: number,
  completionsThisMonth: number
): number {
  let score = 0;
  score += Math.min(postedThisWeek * 15, 45);
  score += queueCount > 0 ? 15 : 0;
  score += editedCount > 0 ? 10 : 0;
  score += inProductionCount > 0 ? 10 : 0;
  score += Math.round(Math.min(completionsThisMonth / 20, 1) * 20);
  return Math.min(score, 100);
}

function getThroughputLabel(score: number): string {
  if (score >= 86) return "Peak Throughput";
  if (score >= 71) return "Strong Creator";
  if (score >= 51) return "Steady Output";
  if (score >= 31) return "Building Momentum";
  return "Getting Started";
}

function getHealthStatus(
  editedCount: number,
  editingCount: number,
  queueCount: number,
  recordedCount: number
): { label: string; level: "healthy" | "warning" | "urgent" } {
  if (editedCount > 5) return { label: `${editedCount} videos waiting to post`, level: "warning" };
  if (editingCount > 4) return { label: "Editing backlog building", level: "warning" };
  if (queueCount === 0 && recordedCount === 0 && editingCount === 0) return { label: "Pipeline empty — add to queue", level: "urgent" };
  if (editedCount > 0) return { label: `${editedCount} video${editedCount > 1 ? "s" : ""} ready to publish`, level: "healthy" };
  return { label: "Pipeline healthy", level: "healthy" };
}

function getAvgHookScore(hookScores: HookScore[]): number {
  if (!hookScores.length) return 0;
  const allScores = hookScores.flatMap(h => Object.values(h.scores ?? {}));
  if (!allScores.length) return 0;
  return Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
}

function getTopEmotionalTag(tiktokPosts: TikTokPost[]): string | null {
  if (!tiktokPosts.length) return null;
  const tagMap: Record<string, { count: number; totalViews: number }> = {};
  for (const p of tiktokPosts) {
    if (!p.emotional_tag) continue;
    if (!tagMap[p.emotional_tag]) tagMap[p.emotional_tag] = { count: 0, totalViews: 0 };
    tagMap[p.emotional_tag].count++;
    tagMap[p.emotional_tag].totalViews += p.views ?? 0;
  }
  const sorted = Object.entries(tagMap).sort((a, b) => b[1].totalViews - a[1].totalViews);
  return sorted[0]?.[0] ?? null;
}

function getPublishingReadiness(edited: VideoItem[]): number {
  if (!edited.length) return 100;
  const scores = edited.map(v => {
    let pts = 34; // title always present
    if (v.notes && v.notes.length > 0) pts += 33;
    if (v.thumbnail_url && v.thumbnail_url.length > 0) pts += 33;
    return pts;
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function isThisWeek(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
}

export function ChannelClient({ videos, recordingQueue, hookScores, completionsThisWeek, completionsThisMonth, tiktokPosts }: Props) {
  const byStatus = useMemo(() => {
    const map: Record<string, VideoItem[]> = { Recorded: [], Editing: [], Edited: [], Posted: [] };
    for (const v of videos) {
      if (map[v.status]) map[v.status].push(v);
    }
    return map;
  }, [videos]);

  const postedThisWeek = useMemo(
    () => byStatus.Posted.filter(v => isThisWeek(v.posted_at)).length,
    [byStatus]
  );

  const throughputScore = getThroughputScore(
    postedThisWeek,
    recordingQueue.length,
    byStatus.Edited.length,
    byStatus.Recorded.length + byStatus.Editing.length,
    completionsThisMonth
  );

  const health = getHealthStatus(
    byStatus.Edited.length,
    byStatus.Editing.length,
    recordingQueue.length,
    byStatus.Recorded.length
  );

  const avgHookScore = getAvgHookScore(hookScores);
  const topTag = getTopEmotionalTag(tiktokPosts);
  const publishReadiness = getPublishingReadiness(byStatus.Edited);

  const healthColors = {
    healthy: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    urgent: "text-red-600 bg-red-500/10 border-red-500/20",
  };

  const healthIcons = {
    healthy: CheckCircle2,
    warning: AlertTriangle,
    urgent: AlertCircle,
  };

  const HealthIcon = healthIcons[health.level];

  return (
    <div className="flex-1 p-4 space-y-4 pb-24 md:pb-8 max-w-4xl mx-auto w-full">

      {/* Operational Health Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium",
          healthColors[health.level]
        )}
      >
        <HealthIcon className="h-4 w-4 shrink-0" />
        <span>{health.label}</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs opacity-70">
          <Activity className="h-3.5 w-3.5" />
          <span>Throughput {throughputScore}</span>
        </div>
      </motion.div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Posted this week", value: postedThisWeek, icon: Upload, color: "text-purple-500" },
          { label: "In pipeline", value: byStatus.Recorded.length + byStatus.Editing.length, icon: Edit3, color: "text-amber-500" },
          { label: "Ready to post", value: byStatus.Edited.length, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Queue planned", value: recordingQueue.length, icon: Film, color: "text-blue-500" },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="p-4 space-y-2">
              <div className={cn("flex items-center gap-2", metric.color)}>
                <metric.icon className="h-4 w-4" />
                <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground leading-none">{metric.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div key={action.href} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.04 }}>
              <Link
                href={action.href}
                className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-200 tap-scale group"
              >
                <action.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground leading-tight">{action.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{action.desc}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pipeline Status Grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Content Pipeline</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PIPELINE_COLUMNS.map((col, i) => {
            const items = byStatus[col.status] ?? [];
            const isBacklog = items.length > 4 && col.status !== "Posted";
            return (
              <motion.div key={col.status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                <Card className={cn("p-3 border", isBacklog && "border-amber-500/30")}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("flex items-center gap-1.5", col.color)}>
                      <col.icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{col.label}</span>
                    </div>
                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-lg", col.bg, col.color)}>
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-1 min-h-[48px]">
                    {items.slice(0, 3).map(v => (
                      <p key={v.id} className="text-[11px] text-muted-foreground leading-tight truncate">{v.title}</p>
                    ))}
                    {items.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/50 italic">Empty</p>
                    )}
                    {items.length > 3 && (
                      <p className="text-[10px] text-muted-foreground/60">+{items.length - 3} more</p>
                    )}
                  </div>
                  {isBacklog && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Backlog</span>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Two-column: Review Queue + Active Projects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Review Queue */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold">Ready to Post</span>
              </div>
              <Badge variant={byStatus.Edited.length > 0 ? "success" : "default"}>
                {byStatus.Edited.length}
              </Badge>
            </div>
            {byStatus.Edited.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No videos awaiting review</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Edit a video to see it here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {byStatus.Edited.slice(0, 4).map(v => (
                  <div key={v.id} className="flex items-start gap-2 p-2 rounded-xl bg-muted/40">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{v.platform}</span>
                        {!v.notes && <span className="text-[10px] text-amber-600">· needs description</span>}
                        {!v.thumbnail_url && <span className="text-[10px] text-amber-600">· needs thumbnail</span>}
                      </div>
                    </div>
                    <Link
                      href={`/review/${v.id}`}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium transition-colors"
                      title="Open Review Mode"
                    >
                      <ScanSearch className="h-3 w-3" />
                      Review
                    </Link>
                  </div>
                ))}
                {byStatus.Edited.length > 4 && (
                  <Link href="/videos" className="flex items-center gap-1 text-[11px] text-primary hover:underline pt-1">
                    <span>View all {byStatus.Edited.length} videos</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Active Projects (Recording Queue) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold">Recording Queue</span>
              </div>
              <Badge variant="info">{recordingQueue.length}</Badge>
            </div>
            {recordingQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Film className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Queue is empty</p>
                <Link href="/queue" className="text-[11px] text-primary hover:underline mt-1">
                  Add recordings
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recordingQueue.slice(0, 4).map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-xl bg-muted/40">
                    <span className="text-[10px] font-bold text-muted-foreground/60 mt-0.5 w-4 shrink-0">#{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      {item.filming_notes && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.filming_notes}</p>
                      )}
                    </div>
                  </div>
                ))}
                {recordingQueue.length > 4 && (
                  <Link href="/queue" className="flex items-center gap-1 text-[11px] text-primary hover:underline pt-1">
                    <span>View all {recordingQueue.length} items</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Two-column: Publishing Readiness + Retention Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Publishing Readiness */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-semibold">Publishing Readiness</span>
            </div>
            {byStatus.Edited.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No videos ready for publishing yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold text-foreground">{publishReadiness}%</span>
                  <span className="text-xs text-muted-foreground mb-1">avg readiness</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn("h-2 rounded-full transition-all duration-500", publishReadiness >= 80 ? "bg-emerald-500" : publishReadiness >= 50 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${publishReadiness}%` }}
                  />
                </div>
                <div className="space-y-1.5 mt-2">
                  {[
                    { label: "Title", check: true },
                    { label: "Description (notes)", check: byStatus.Edited.some(v => v.notes && v.notes.length > 0) },
                    { label: "Thumbnail", check: byStatus.Edited.some(v => v.thumbnail_url && v.thumbnail_url.length > 0) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      {item.check
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      }
                      <span className={cn("text-xs", item.check ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Retention Snapshot */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-semibold">Retention Snapshot</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Avg hook score</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {hookScores.length > 0 ? `${avgHookScore}/10` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-pink-500" />
                  <span className="text-xs text-muted-foreground">Top emotional tag</span>
                </div>
                <span className="text-sm font-bold text-foreground capitalize">
                  {topTag ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Posted this month</span>
                </div>
                <span className="text-sm font-bold text-foreground">{completionsThisMonth}</span>
              </div>
              <Link href="/analytics" className="flex items-center justify-end gap-1 text-[11px] text-primary hover:underline">
                <span>Full analytics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Throughput Score */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Throughput Score</span>
            </div>
            <Badge variant={throughputScore >= 70 ? "success" : throughputScore >= 40 ? "warning" : "default"}>
              {getThroughputLabel(throughputScore)}
            </Badge>
          </div>
          <div className="flex items-end gap-4 mb-3">
            <span className="text-5xl font-bold gradient-text">{throughputScore}</span>
            <span className="text-sm text-muted-foreground mb-2">/ 100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${throughputScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
              className="h-2.5 rounded-full gradient-primary"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Posts this week", value: postedThisWeek, max: 5, color: "bg-purple-500" },
              { label: "Queue planned", value: Math.min(recordingQueue.length, 10), max: 10, color: "bg-blue-500" },
              { label: "Ready to ship", value: Math.min(byStatus.Edited.length, 5), max: 5, color: "bg-emerald-500" },
              { label: "Month consistency", value: completionsThisMonth, max: 20, color: "bg-pink-500" },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={cn("h-1.5 rounded-full transition-all duration-500", item.color)}
                    style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Footer links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[
          { label: "Video Tracker", href: "/videos" },
          { label: "Calendar", href: "/calendar" },
          { label: "Weekly Report", href: "/weekly-report" },
          { label: "Strategist", href: "/strategist" },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted tap-scale"
          >
            {link.label}
            <ChevronRight className="h-3 w-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}
