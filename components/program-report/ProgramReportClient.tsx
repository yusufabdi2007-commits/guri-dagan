"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, Shield, TrendingUp, Star, Zap, AlertCircle,
  Users, UserCheck, Video, ArrowRight, RefreshCw
} from "lucide-react";
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
  recentLeads: number;
}

interface ReportData {
  best_program: string;
  fastest_growing: string;
  most_profitable: string;
  underused: string;
  summary: string;
  focus_recommendation: string;
  is_fallback?: boolean;
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

const INSIGHTS = [
  {
    key: "best_program" as const,
    label: "Best by Leads",
    icon: <Star className="h-4 w-4 text-amber-500" />,
    bg: "bg-amber-500/5 border-amber-500/20",
  },
  {
    key: "fastest_growing" as const,
    label: "Fastest Growing",
    icon: <TrendingUp className="h-4 w-4 text-sky-500" />,
    bg: "bg-sky-500/5 border-sky-500/20",
  },
  {
    key: "most_profitable" as const,
    label: "Most Profitable",
    icon: <UserCheck className="h-4 w-4 text-emerald-500" />,
    bg: "bg-emerald-500/5 border-emerald-500/20",
  },
  {
    key: "underused" as const,
    label: "Underused",
    icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
    bg: "bg-rose-500/5 border-rose-500/20",
  },
];

export function ProgramReportClient({ programs, totals, topProgram, fastestGrowing, mostProfitable, underused }: Props) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);
    try {
      const res = await fetch("/api/program-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programStats: programs, totals, topProgram, fastestGrowing, mostProfitable, underused }),
      });
      if (!res.ok) throw new Error();
      setReport(await res.json());
    } catch {
      toast({ title: "Could not generate report", variant: "destructive" as never });
    } finally {
      setLoading(false);
    }
  }

  const maxLeads = Math.max(...PROGRAM_ORDER.map(p => programs[p]?.leads ?? 0), 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Videos", value: totals.videos, icon: <Video className="h-4 w-4 text-violet-500" /> },
          { label: "Leads", value: totals.leads, icon: <Users className="h-4 w-4 text-sky-500" /> },
          { label: "Clients", value: totals.clients, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* AI Report */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Weekly AI Analysis</p>
          </div>
          <Button size="sm" onClick={generateReport} disabled={loading} variant={report ? "ghost" : "default"}>
            {loading ? (
              <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Analysing...</>
            ) : report ? (
              <><RefreshCw className="h-3 w-3 mr-1" />Refresh</>
            ) : (
              <><Zap className="h-3 w-3 mr-1" />Generate</>
            )}
          </Button>
        </div>

        {!report && !loading && (
          <p className="text-xs text-muted-foreground">
            Click Generate to get an AI analysis of your program performance — which programs attract the most leads, generate clients, and what to focus on this week.
          </p>
        )}

        {report && (
          <div className="space-y-4">
            {/* 4-insight grid */}
            <div className="grid grid-cols-2 gap-2">
              {INSIGHTS.map(({ key, label, icon, bg }) => (
                <div key={key} className={cn("border rounded-2xl p-3", bg)}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {icon}
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{report[key]}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">What the data shows</p>
              <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
            </div>

            {/* Focus recommendation */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">This week: record</p>
              <p className="text-sm font-medium text-foreground">{report.focus_recommendation}</p>
            </div>

            {report.is_fallback && (
              <p className="text-[10px] text-muted-foreground/60 italic">Using default analysis — add program attribution to leads for personalised insights.</p>
            )}
          </div>
        )}
      </div>

      {/* Program performance table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Program Breakdown</p>
        </div>
        <div className="divide-y divide-border">
          {PROGRAM_ORDER.map((name) => {
            const stat = programs[name];
            const prog = PROGRAMS[name];
            if (!stat) return null;

            return (
              <div key={name} className="px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0", getProgramBadgeClass(name))}>
                    <Shield className="h-2 w-2" />{name}
                  </span>
                  <span className="text-[10px] text-muted-foreground italic truncate">{prog.childTransformation}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Videos", value: stat.videos, color: "text-foreground" },
                    { label: "Leads", value: stat.leads, color: "text-sky-600 dark:text-sky-400" },
                    { label: "Clients", value: stat.clients, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Conv.", value: `${stat.conversion}%`, color: stat.conversion > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className={cn("text-base font-bold", color)}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {stat.recentLeads > 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">+{stat.recentLeads} lead{stat.recentLeads > 1 ? "s" : ""} this month</p>
                )}
                {stat.topTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stat.topTopics.map(t => (
                      <span key={t} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/programs">
          <Button variant="outline" size="sm" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />Program Dashboard
          </Button>
        </Link>
        <Link href="/weekly-assignment">
          <Button variant="outline" size="sm" className="gap-1">
            <Zap className="h-3.5 w-3.5" />Plan Content
          </Button>
        </Link>
        <Link href="/leads">
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="h-3.5 w-3.5" />View Leads
          </Button>
        </Link>
      </div>
    </div>
  );
}
