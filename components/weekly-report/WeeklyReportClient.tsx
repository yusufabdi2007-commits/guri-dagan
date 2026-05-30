"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Lightbulb, CheckCircle2, RefreshCw, Target, Sparkles, BarChart3
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface WeeklyData {
  completions: { completed_date: string; platform: string }[];
  ideas: { category: string; status: string }[];
  streak: number;
  totalPosts: number;
  weeklyGoal: number;
  pendingIdeas: number;
  userId: string;
}

interface ReportResult {
  summary: string;
  wins: string;
  warnings: string | null;
  next_week: string[];
  insight: string;
  momentum_score: number;
}

export function WeeklyReportClient({
  completions, ideas, streak, totalPosts, weeklyGoal, pendingIdeas, userId
}: WeeklyData) {
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const postsThisWeek = completions.filter(c => {
    const d = new Date(c.completed_date);
    return d >= weekStart && d <= weekEnd;
  }).length;

  const postsLastWeek = completions.filter(c => {
    const d = new Date(c.completed_date);
    return d >= lastWeekStart && d <= lastWeekEnd;
  }).length;

  const categoryBreakdown = ideas.reduce<Record<string, number>>((acc, i) => {
    if (i.status === "Posted") acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0];

  const dayCounts = completions.reduce<Record<number, number>>((acc, c) => {
    const d = new Date(c.completed_date).getDay();
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bestDayIdx = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayIdx ? dayNames[parseInt(bestDayIdx[0])] : null;

  const consistency = weeklyGoal > 0
    ? Math.min(100, Math.round((postsThisWeek / weeklyGoal) * 100))
    : 0;

  const growthDelta = postsThisWeek - postsLastWeek;
  const GrowthIcon = growthDelta > 0 ? TrendingUp : growthDelta < 0 ? TrendingDown : Minus;
  const growthColor = growthDelta > 0 ? "text-green-600 dark:text-green-400" : growthDelta < 0 ? "text-red-500" : "text-muted-foreground";

  async function generateReport(force = false) {
    const cacheKey = `weekly_report_${format(weekStart, "yyyy-MM-dd")}`;

    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setReport(JSON.parse(cached));
        setGenerated(true);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postsThisWeek,
          postsLastWeek,
          streak,
          totalPosts,
          topCategory,
          categoryBreakdown,
          bestDay,
          consistency,
          weeklyGoal,
          pendingIdeas,
        }),
      });
      const json: ReportResult = await res.json();
      setReport(json);
      setGenerated(true);

      sessionStorage.setItem(cacheKey, JSON.stringify(json));

      // Save to DB
      const supabase = createClient();
      await supabase.from("weekly_reports").upsert(
        {
          user_id: userId,
          week_start: format(weekStart, "yyyy-MM-dd"),
          week_end: format(weekEnd, "yyyy-MM-dd"),
          posts_this_week: postsThisWeek,
          posts_last_week: postsLastWeek,
          streak_at_generation: streak,
          top_category: topCategory || null,
          ai_summary: json.summary,
          ai_wins: json.wins,
          ai_warnings: json.warnings || null,
          ai_next_week: json.next_week,
        },
        { onConflict: "user_id,week_start" }
      );
    } catch {
      setReport({
        summary: "Your weekly report is ready. Keep building momentum.",
        wins: "You showed up this week. Consistency is the foundation of growth.",
        warnings: null,
        next_week: ["Record one video in your top category.", "Repurpose a past video.", "Reply to 5 comments."],
        insight: "Creators who stay consistent for 90+ days see compounding growth.",
        momentum_score: 65,
      });
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cacheKey = `weekly_report_${format(weekStart, "yyyy-MM-dd")}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setReport(JSON.parse(cached));
      setGenerated(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scoreColor = report
    ? report.momentum_score >= 80 ? "text-green-600 dark:text-green-400"
    : report.momentum_score >= 50 ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-500"
    : "";

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Week header */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
          Week of
        </p>
        <p className="text-lg font-bold text-foreground">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{postsThisWeek}</div>
            <div className="text-xs text-muted-foreground">This week</div>
            <div className={`flex items-center justify-center gap-0.5 mt-1 text-xs font-semibold ${growthColor}`}>
              <GrowthIcon className="h-3 w-3" />
              {Math.abs(growthDelta)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{streak}</div>
            <div className="text-xs text-muted-foreground">Day streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{consistency}%</div>
            <div className="text-xs text-muted-foreground">Goal hit</div>
          </CardContent>
        </Card>
      </div>

      {/* Generate button */}
      {!generated && (
        <Button
          onClick={() => generateReport()}
          disabled={loading}
          className="w-full h-12 font-semibold text-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating your report...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate AI Weekly Report
            </span>
          )}
        </Button>
      )}

      {/* Report content */}
      {report && (
        <>
          {/* Momentum score */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Momentum Score
                </span>
                <button
                  onClick={() => generateReport(true)}
                  disabled={loading}
                  className="p-1 rounded-lg hover:bg-primary/10"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold ${scoreColor}`}>{report.momentum_score}</span>
                <span className="text-muted-foreground text-sm mb-1">/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${report.momentum_score}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Week Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
            </CardContent>
          </Card>

          {/* Wins */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">
                    This Week&apos;s Wins
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{report.wins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {report.warnings && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                      Watch This
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{report.warnings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next week actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Next Week — Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {report.next_week.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground">{action}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Strategic insight */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    Creator Intelligence Insight
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{report.insight}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Posted Categories This Month</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{cat}</span>
                      <Badge variant="secondary">{count} posts</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Motivational footer */}
      <Card className="bg-accent/30 border-accent/50">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-semibold">Qof kasta oo aad u barantaa waa guul.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Every family you help is the whole point.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
