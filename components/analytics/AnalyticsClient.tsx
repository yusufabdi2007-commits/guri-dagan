"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, BarChart3, Target, Flame, ArrowUp, ArrowDown, Minus, Calendar, Youtube, Sparkles, AlertCircle, Users, UserCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format, subDays, startOfWeek, addDays } from "date-fns";

interface PerformanceRow {
  category: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string | null;
  platform: string;
}

interface AttributionRow {
  lead_id: string;
  content_category: string | null;
}

interface LeadRow {
  id: string;
  stage: string;
}

interface Props {
  completions: { id: string; completed_date: string; platform: string }[];
  ideas: { platform: string; category: string; status: string; created_at: string }[];
  videos: { platform: string; status: string; posted_at: string | null; created_at: string }[];
  performance?: PerformanceRow[];
  attribution?: AttributionRow[];
  leads?: LeadRow[];
}

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "#000000",
  YouTube: "#FF0000",
  Instagram: "#E1306C",
  Facebook: "#1877F2",
};

const CHART_COLORS = ["#7c3aed", "#a855f7", "#c084fc", "#e879f9", "#f0abfc"];

export function AnalyticsClient({ completions, ideas, videos, performance = [], attribution = [], leads = [] }: Props) {
  // Weekly activity (last 8 weeks)
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subDays(new Date(), (7 - i) * 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const posts = completions.filter(c => {
      const d = new Date(c.completed_date);
      return d >= weekStart && d <= weekEnd;
    }).length;
    return {
      week: format(weekStart, "MMM d"),
      posts,
    };
  });

  // Platform breakdown (completions)
  const platformCounts = completions.reduce<Record<string, number>>((acc, c) => {
    acc[c.platform] = (acc[c.platform] || 0) + 1;
    return acc;
  }, {});
  const platformData = Object.entries(platformCounts).map(([name, value]) => ({ name, value }));

  // Category breakdown (ideas)
  const categoryCounts = ideas.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Last 30 days daily posts
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(new Date(), 29 - i);
    const dayStr = day.toISOString().split("T")[0];
    const posted = completions.some(c => c.completed_date.startsWith(dayStr));
    return { day: format(day, "d"), posted };
  });

  const totalPosts = completions.length;
  const now = new Date();

  const thisMonth = completions.filter(c => {
    const d = new Date(c.completed_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const lastMonth = completions.filter(c => {
    const d = new Date(c.completed_date);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).length;

  const thisWeek = completions.filter(c => {
    const d = new Date(c.completed_date);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    return d >= weekStart;
  }).length;

  // Growth velocity: this month vs last month
  const growthDelta = thisMonth - lastMonth;
  const growthPct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  // Best day of week
  const dayCounts = completions.reduce<Record<number, number>>((acc, c) => {
    const d = new Date(c.completed_date).getDay();
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bestDayIndex = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayIndex ? dayNames[parseInt(bestDayIndex[0])] : null;

  // Posted ideas (category analysis of what actually gets done)
  const postedIdeas = ideas.filter(i => i.status === "Posted");
  const postedCatCounts = postedIdeas.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const topPostedCategories = Object.entries(postedCatCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // YouTube category performance intelligence
  // Build per-category stats: total views, video count, avg views
  const ALL_CATEGORIES = [
    "Parenting Communication", "Discipline", "Emotional Regulation",
    "Islamic Parenting", "Family Relationships", "Child Development", "Other",
  ];
  const catStats: Record<string, { totalViews: number; count: number; recentViews: number }> = {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const row of performance) {
    if (!catStats[row.category]) catStats[row.category] = { totalViews: 0, count: 0, recentViews: 0 };
    catStats[row.category].totalViews += row.views;
    catStats[row.category].count += 1;
    if (row.published_at && new Date(row.published_at) >= thirtyDaysAgo) {
      catStats[row.category].recentViews += row.views;
    }
  }

  const catPerformance = ALL_CATEGORIES
    .map(cat => ({
      category: cat,
      totalViews: catStats[cat]?.totalViews ?? 0,
      count: catStats[cat]?.count ?? 0,
      avgViews: catStats[cat]?.count
        ? Math.round((catStats[cat].totalViews) / catStats[cat].count)
        : 0,
      recentViews: catStats[cat]?.recentViews ?? 0,
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.avgViews - a.avgViews);

  const bestCategory = catPerformance[0] ?? null;
  const fastestGrowing = [...catPerformance].sort((a, b) => b.recentViews - a.recentViews)[0] ?? null;
  // Underutilized: in ALL_CATEGORIES but zero or very few videos
  const underutilized = ALL_CATEGORIES
    .filter(cat => !catStats[cat] || catStats[cat].count === 0)
    .slice(0, 2);

  const hasCategoryIntel = catPerformance.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Posts</span>
            </div>
            <div className="text-3xl font-bold">{totalPosts}</div>
            <p className="text-xs text-muted-foreground mt-0.5">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <div className="text-3xl font-bold">{thisWeek}</div>
            <p className="text-xs text-muted-foreground mt-0.5">/ 5 goal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
            <div className="text-3xl font-bold">{thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-0.5">posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Ideas</span>
            </div>
            <div className="text-3xl font-bold">{ideas.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">in database</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Weekly Activity (8 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                cursor={{ fill: "rgba(124,58,237,0.05)" }}
              />
              <Bar dataKey="posts" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Posts" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      {platformData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "none" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {platformData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: PLATFORM_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-xs text-foreground">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Categories */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Content Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryData.map((cat, i) => {
              const max = categoryData[0]?.value || 1;
              const pct = (cat.value / max) * 100;
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">{cat.value} ideas</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Daily Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-1.5">
            {last30.map((d, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg ${d.posted ? "gradient-primary" : "bg-muted"}`}
                title={d.day}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Growth Velocity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Growth Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{thisMonth}</span>
                {growthPct !== null && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold mb-1 ${
                    growthDelta > 0 ? "text-green-600" : growthDelta < 0 ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {growthDelta > 0 ? <ArrowUp className="h-3 w-3" /> : growthDelta < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(growthPct)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">vs {lastMonth} last month</p>
            </div>
            {bestDay && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Best Posting Day</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{bestDay}</span>
                </div>
                <p className="text-xs text-muted-foreground">most consistent day</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topic Performance — what actually gets posted */}
      {topPostedCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Most-Posted Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground -mt-1">Categories you actually publish (not just plan)</p>
            {topPostedCategories.map(([cat, count], i) => {
              const max = topPostedCategories[0]?.[1] || 1;
              const pct = (count / max) * 100;
              const totalForCat = categoryCounts[cat] || count;
              const completionRate = Math.round((count / totalForCat) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{cat}</span>
                    <span className="text-muted-foreground">{count} posted · {completionRate}% done rate</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* YouTube Category Intelligence */}
      {hasCategoryIntel ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-500" />
              Category Performance Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Insight trio */}
            <div className="grid grid-cols-1 gap-2">
              {bestCategory && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50/60 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                  <Sparkles className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Best-Performing Category</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{bestCategory.category}</span>
                      {" "}— avg {bestCategory.avgViews.toLocaleString()} views across {bestCategory.count} video{bestCategory.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}
              {fastestGrowing && fastestGrowing.category !== bestCategory?.category && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                  <TrendingUp className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Fastest-Growing (Last 30 Days)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{fastestGrowing.category}</span>
                      {" "}— {fastestGrowing.recentViews.toLocaleString()} recent views
                    </p>
                  </div>
                </div>
              )}
              {underutilized.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Untapped Categories</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You have no videos yet in:{" "}
                      <span className="font-medium text-foreground">{underutilized.join(", ")}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Category view bars */}
            <div className="space-y-2.5 pt-1">
              {catPerformance.map((cat, i) => {
                const maxAvg = catPerformance[0]?.avgViews || 1;
                const pct = (cat.avgViews / maxAvg) * 100;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">
                        {cat.avgViews.toLocaleString()} avg views · {cat.count} video{cat.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-4 text-center">
            <Youtube className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">No YouTube data yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Connect your YouTube channel in{" "}
              <a href="/connections" className="text-primary hover:underline">Platform Connections</a>
              {" "}to see category performance insights.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content → Clients Intelligence */}
      {attribution.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              Content → Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground -mt-1">Which topics are generating real coaching inquiries</p>
            {(() => {
              // Build category → leads + clients count
              const clientIds = new Set(leads.filter(l => l.stage === "client").map(l => l.id));
              const catLeads: Record<string, { leads: number; clients: number }> = {};
              attribution.forEach(a => {
                if (!a.content_category) return;
                if (!catLeads[a.content_category]) catLeads[a.content_category] = { leads: 0, clients: 0 };
                catLeads[a.content_category].leads += 1;
                if (clientIds.has(a.lead_id)) catLeads[a.content_category].clients += 1;
              });
              const sorted = Object.entries(catLeads).sort((a, b) => b[1].leads - a[1].leads);
              const maxLeads = Math.max(1, ...sorted.map(([, v]) => v.leads));
              return sorted.map(([cat, { leads: lc, clients: cc }]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-sky-600"><Users className="h-3 w-3" />{lc}</span>
                      {cc > 0 && <span className="flex items-center gap-0.5 text-emerald-600"><UserCheck className="h-3 w-3" />{cc}</span>}
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${(lc / maxLeads) * 100}%` }} />
                  </div>
                </div>
              ));
            })()}
            <Link href="/business" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
              Full business intelligence <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ) : hasCategoryIntel ? (
        <Card className="border-dashed border-emerald-300/50 bg-emerald-50/20 dark:bg-emerald-900/5">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-7 w-7 text-emerald-400/50 mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">Track which content creates clients</p>
            <p className="text-[11px] text-muted-foreground mt-1">When you add leads, link them to the content that brought them to you.</p>
            <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
              Open Lead Pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Motivational Footer */}
      <Card className="bg-accent/30 border-accent/50">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-semibold text-foreground">
            Every post plants a seed of change in a Somali family.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Qof kasta oo aad u barantaa waa guul.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
