"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, TrendingUp, Users, Video, UserCheck, Zap, BarChart3, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROGRAMS, getProgramBadgeClass } from "@/lib/programs";
import { toast } from "@/components/ui/use-toast";

type ProgramName = keyof typeof PROGRAMS;

interface ProgramStat {
  videos: number;
  leads: number;
  clients: number;
  conversion: number;
  topTopics: string[];
  topCtas: { cta: string; count: number }[];
  recentLeads: number;
}

interface Props {
  programs: Record<string, ProgramStat>;
  totals: { videos: number; leads: number; clients: number };
  topProgram: string | null;
  fastestGrowing: string | null;
  mostProfitable: string | null;
  underused: string | null;
}

const PROGRAM_ORDER: ProgramName[] = ["MePower™", "Inner Power™", "MindPower™", "DreamPower™", "Slaying Dragons™"];

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgramsDashboardClient({ programs, totals, topProgram, fastestGrowing, mostProfitable, underused }: Props) {
  const [selected, setSelected] = useState<ProgramName | null>(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<{
    summary: string;
    focus_recommendation: string;
    best_program: string;
    fastest_growing: string;
    most_profitable: string;
    underused: string;
  } | null>(null);

  const maxLeads = Math.max(...PROGRAM_ORDER.map(p => programs[p]?.leads ?? 0), 1);
  const maxVideos = Math.max(...PROGRAM_ORDER.map(p => programs[p]?.videos ?? 0), 1);

  async function handleGenerateReport() {
    setGenerating(true);
    try {
      const res = await fetch("/api/program-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programStats: programs, totals, topProgram, fastestGrowing, mostProfitable, underused }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReport(data);
    } catch {
      toast({ title: "Could not generate report", variant: "destructive" as never });
    } finally {
      setGenerating(false);
    }
  }

  const selectedStat = selected ? programs[selected] : null;
  const selectedProgram = selected ? PROGRAMS[selected] : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Videos", value: totals.videos, icon: <Video className="h-4 w-4 text-violet-500" /> },
          { label: "Total Leads", value: totals.leads, icon: <Users className="h-4 w-4 text-sky-500" /> },
          { label: "Total Clients", value: totals.clients, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
            {icon}
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Insights chips */}
      {(topProgram || fastestGrowing || mostProfitable || underused) && (
        <div className="grid grid-cols-2 gap-2">
          {topProgram && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Top by Leads</p>
              <p className="text-sm font-bold text-foreground">{topProgram}</p>
            </div>
          )}
          {mostProfitable && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Most Profitable</p>
              <p className="text-sm font-bold text-foreground">{mostProfitable}</p>
            </div>
          )}
          {fastestGrowing && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fastest Growing</p>
              <p className="text-sm font-bold text-foreground">{fastestGrowing}</p>
            </div>
          )}
          {underused && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Underused</p>
              <p className="text-sm font-bold text-foreground">{underused}</p>
            </div>
          )}
        </div>
      )}

      {/* Program cards */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Programs</p>
        {PROGRAM_ORDER.map((name) => {
          const stat = programs[name];
          const prog = PROGRAMS[name];
          if (!stat) return null;
          const isSelected = selected === name;

          return (
            <div key={name} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setSelected(isSelected ? null : name)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1", getProgramBadgeClass(name))}>
                      <Shield className="h-2.5 w-2.5" />{name}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">{prog.childTransformation}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground">{stat.videos}</p>
                    <p className="text-[10px] text-muted-foreground">videos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground">{stat.leads}</p>
                    <p className="text-[10px] text-muted-foreground">leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stat.clients}</p>
                    <p className="text-[10px] text-muted-foreground">clients</p>
                  </div>
                  <ArrowRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
                </div>
              </button>

              {/* Progress bars */}
              <div className="px-4 pb-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">Videos</span>
                  <StatBar value={stat.videos} max={maxVideos} color="bg-violet-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">Leads</span>
                  <StatBar value={stat.leads} max={maxLeads} color="bg-sky-400" />
                </div>
                {stat.leads > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{stat.conversion}% conversion rate</span>
                    {stat.recentLeads > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">+{stat.recentLeads} this month</span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Program Goal</p>
                  <p className="text-xs text-muted-foreground">{prog.emotionalGoal}</p>
                  <p className="text-xs text-muted-foreground">Theme: <span className="text-foreground font-medium">{prog.theme}</span></p>

                  {stat.topTopics.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Top Topics (attributed)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stat.topTopics.map(t => (
                          <span key={t} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stat.topCtas.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">CTAs Used</p>
                      <div className="space-y-1">
                        {stat.topCtas.map(({ cta, count }) => (
                          <div key={cta} className="flex items-center justify-between">
                            <span className="text-xs text-foreground line-clamp-1 flex-1 mr-2">{cta}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">×{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Link href="/weekly-assignment" className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline">
                      <Zap className="h-3 w-3" />Create content for this program
                    </Link>
                    <Link href="/leads" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground ml-4">
                      <Users className="h-3 w-3" />View leads
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Report section */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">AI Program Analysis</p>
          </div>
          <Button size="sm" onClick={handleGenerateReport} disabled={generating} variant="outline">
            {generating ? "Analysing..." : "Generate Report"}
          </Button>
        </div>

        {report ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">This week: focus on</p>
              <p className="text-sm font-medium text-foreground">{report.focus_recommendation}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/program-report">
                <Button size="sm" variant="ghost" className="text-xs gap-1">
                  <ExternalLink className="h-3 w-3" />Full Report
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Get an AI-generated analysis of which programs are growing, which generate clients, and what to focus on this week.
          </p>
        )}
      </div>
    </div>
  );
}
