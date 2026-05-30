"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, UserCheck, PhoneCall, TrendingUp, ArrowRight,
  AlertCircle, BarChart3, Youtube, Share2, MessageCircle,
  UserPlus, Sparkles, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/components/leads/LeadPipelineClient";

interface Attribution {
  id: string;
  lead_id: string;
  content_category: string | null;
  youtube_video_id: string | null;
  video_title: string | null;
  tiktok_topic: string | null;
}

interface VideoPerf {
  category: string | null;
  views: number;
  published_at: string | null;
}

interface Props {
  leads: Lead[];
  attribution: Attribution[];
  performance: VideoPerf[];
}

const STAGE_ORDER = ["new_lead", "contacted", "call_scheduled", "call_completed", "client", "follow_up", "closed"];

const SOURCE_ICON: Record<string, React.ReactNode> = {
  tiktok:    <Share2 className="h-3.5 w-3.5" />,
  youtube:   <Youtube className="h-3.5 w-3.5" />,
  whatsapp:  <MessageCircle className="h-3.5 w-3.5" />,
  referral:  <UserPlus className="h-3.5 w-3.5" />,
  existing_client: <UserCheck className="h-3.5 w-3.5" />,
  other:     <Users className="h-3.5 w-3.5" />,
};

const ALL_CATEGORIES = [
  "Parenting Communication", "Discipline", "Emotional Regulation",
  "Islamic Parenting", "Family Relationships", "Child Development", "Other"
];

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

export function BusinessDashboardClient({ leads, attribution, performance }: Props) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyAgo = new Date(Date.now() - 30 * 86400000);

  // Funnel metrics
  const total = leads.length;
  const contacted = leads.filter(l => STAGE_ORDER.indexOf(l.stage) >= 1).length;
  const callsScheduled = leads.filter(l => l.stage === "call_scheduled" || l.stage === "call_completed").length;
  const callsDone = leads.filter(l => l.stage === "call_completed" || l.stage === "client").length;
  const clients = leads.filter(l => l.stage === "client").length;
  const thisMonth = leads.filter(l => l.created_at >= monthStart).length;
  const clientsThisMonth = leads.filter(l => l.stage === "client" && l.updated_at >= monthStart).length;
  const conversionRate = pct(clients, total);

  // Leads by source
  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  // Attribution: leads per category
  const leadsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    attribution.forEach(a => {
      if (a.content_category) map[a.content_category] = (map[a.content_category] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [attribution]);

  // Attribution: clients per category (leads that became clients)
  const clientLeadIds = new Set(leads.filter(l => l.stage === "client").map(l => l.id));
  const clientsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    attribution.forEach(a => {
      if (a.content_category && clientLeadIds.has(a.lead_id)) {
        map[a.content_category] = (map[a.content_category] || 0) + 1;
      }
    });
    return map;
  }, [attribution, leads]);

  // YouTube views by category
  const viewsByCategory = useMemo(() => {
    const map: Record<string, { views: number; recentViews: number }> = {};
    performance.forEach(p => {
      if (!p.category) return;
      if (!map[p.category]) map[p.category] = { views: 0, recentViews: 0 };
      map[p.category].views += p.views;
      if (p.published_at && new Date(p.published_at) >= thirtyAgo) map[p.category].recentViews += p.views;
    });
    return map;
  }, [performance]);

  // Top videos by leads
  const videoLeadCounts = useMemo(() => {
    const map: Record<string, { title: string; count: number }> = {};
    attribution.forEach(a => {
      if (a.youtube_video_id && a.video_title) {
        if (!map[a.youtube_video_id]) map[a.youtube_video_id] = { title: a.video_title, count: 0 };
        map[a.youtube_video_id].count += 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [attribution]);

  // High-views / low-inquiry categories
  const contentIntelligence = useMemo(() => {
    return ALL_CATEGORIES
      .filter(cat => viewsByCategory[cat])
      .map(cat => ({
        category: cat,
        views: viewsByCategory[cat]?.views || 0,
        recentViews: viewsByCategory[cat]?.recentViews || 0,
        leads: leadsByCategory.find(([c]) => c === cat)?.[1] || 0,
        clients: clientsByCategory[cat] || 0,
      }))
      .sort((a, b) => b.views - a.views);
  }, [viewsByCategory, leadsByCategory, clientsByCategory]);

  const maxLeads = Math.max(1, ...leadsByCategory.map(([, n]) => n));
  const maxViews = Math.max(1, ...contentIntelligence.map(c => c.views));

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">

      {/* Conversion Funnel */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Conversion Funnel</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total Inquiries",    value: total,          icon: <Users className="h-4 w-4 text-sky-500" />,     sub: `${thisMonth} this month` },
            { label: "Contacted",          value: contacted,       icon: <MessageCircle className="h-4 w-4 text-violet-500" />, sub: `${pct(contacted, total)}% of inquiries` },
            { label: "Calls Scheduled",    value: callsScheduled,  icon: <PhoneCall className="h-4 w-4 text-amber-500" />, sub: `${pct(callsScheduled, total)}% of inquiries` },
            { label: "Calls Completed",    value: callsDone,       icon: <PhoneCall className="h-4 w-4 text-orange-500" />, sub: `${pct(callsDone, callsScheduled)}% completion` },
            { label: "Clients Won",        value: clients,         icon: <UserCheck className="h-4 w-4 text-emerald-500" />, sub: `${clientsThisMonth} this month` },
            { label: "Conversion Rate",    value: `${conversionRate}%`, icon: <TrendingUp className="h-4 w-4 text-primary" />, sub: "inquiries → client" },
          ].map(({ label, value, icon, sub }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground font-medium">{label}</span></div>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Source breakdown */}
      {bySource.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leads by Source</p>
          <Card><CardContent className="p-4 space-y-3">
            {bySource.map(([src, count]) => (
              <div key={src} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32 shrink-0 text-sm font-medium text-foreground capitalize">
                  {SOURCE_ICON[src]}<span>{src.replace("_", " ")}</span>
                </div>
                <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${pct(count, total)}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
              </div>
            ))}
          </CardContent></Card>
        </div>
      )}

      {/* Content → Clients */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content → Clients</p>
        </div>

        {leadsByCategory.length === 0 ? (
          <Card><CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No attribution data yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">When you add a lead, link it to the content that brought them to you.</p>
            <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline">
              Go to Lead Pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-4 space-y-3">
            {leadsByCategory.map(([cat, count]) => (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{cat}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-sky-600 font-semibold">{count} lead{count !== 1 ? "s" : ""}</span>
                    {clientsByCategory[cat] ? <span className="text-emerald-600 font-semibold">{clientsByCategory[cat]} client{clientsByCategory[cat] !== 1 ? "s" : ""}</span> : null}
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(count / maxLeads) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent></Card>
        )}
      </div>

      {/* Views vs Inquiries (category intelligence) */}
      {contentIntelligence.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Views vs Inquiries</p>
          <div className="space-y-3">
            {contentIntelligence.map(({ category, views, leads: leadCount, clients: clientCount }) => {
              const hasViews = views > 0;
              const hasLeads = leadCount > 0;
              const gap = hasViews && !hasLeads;
              return (
                <Card key={category} className={cn(gap && "border-amber-400/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-foreground">{category}</span>
                      {gap && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg shrink-0">
                          <AlertCircle className="h-3 w-3" />Opportunity
                        </div>
                      )}
                      {clientCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg shrink-0">
                          <UserCheck className="h-3 w-3" />{clientCount} client{clientCount !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <Youtube className="h-3 w-3" />YouTube Views
                        </div>
                        <div className="bg-muted/50 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${(views / maxViews) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground mt-0.5 block">{views.toLocaleString()}</span>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />Inquiries
                        </div>
                        <div className="bg-muted/50 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${(leadCount / maxLeads) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground mt-0.5 block">{leadCount}</span>
                      </div>
                    </div>
                    {gap && (
                      <p className="text-[10px] text-amber-600 mt-2">
                        High views but no attributed leads yet — add a CTA or coaching offer to this content.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Top videos by lead count */}
      {videoLeadCounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Lead-Generating Videos</p>
          <Card><CardContent className="p-4 space-y-3">
            {videoLeadCounts.map(([videoId, { title, count }]) => (
              <div key={videoId} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Youtube className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">{count} lead{count !== 1 ? "s" : ""} attributed</p>
                </div>
                <div className="text-sm font-bold text-primary shrink-0">{count}</div>
              </div>
            ))}
          </CardContent></Card>
        </div>
      )}

      {/* CTA to leads */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Manage your pipeline</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add leads, move them through stages, and track every inquiry.</p>
          </div>
          <Link href="/leads">
            <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium whitespace-nowrap">
              Pipeline <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
