"use client";

import { TrendingUp, Award, Users, BookOpen, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass, PROGRAMS, ProgramName } from "@/lib/programs";

interface ProgramOutcome {
  program: string;
  activeChildren: number;
  graduates: number;
  avgImprovement: number;
  topOutcomes: string[];
  testimonialCount: number;
  totalLeads: number;
  totalClients: number;
  totalRevenue: number;
  goalsAchieved: number;
  totalGoals: number;
}

interface Overall {
  totalChildren: number;
  totalActive: number;
  totalGraduated: number;
  totalMilestones: number;
  publishedStories: number;
  goalsAchieved: number;
  totalGoals: number;
}

interface Props {
  programOutcomes: ProgramOutcome[];
  overall: Overall;
}

export function OutcomesClient({ programOutcomes, overall }: Props) {
  const maxRevenue = Math.max(...programOutcomes.map(p => p.totalRevenue), 1);
  const maxImprovement = Math.max(...programOutcomes.map(p => Math.abs(p.avgImprovement)), 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

      {/* Overall KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Children" value={overall.totalChildren} icon={<Users className="h-4 w-4 text-primary" />} />
        <KpiCard label="Graduated" value={overall.totalGraduated} icon={<Award className="h-4 w-4 text-violet-500" />} />
        <KpiCard label="Goals Achieved" value={`${overall.goalsAchieved}/${overall.totalGoals}`} icon={<Target className="h-4 w-4 text-emerald-500" />} />
        <KpiCard label="Stories Published" value={overall.publishedStories} icon={<BookOpen className="h-4 w-4 text-amber-500" />} />
      </div>

      {/* Per-program cards */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outcomes by Program</p>
        {programOutcomes.map(prog => {
          const programDef = PROGRAMS[prog.program as ProgramName];
          const hasData = prog.activeChildren > 0 || prog.graduates > 0 || prog.totalClients > 0;

          return (
            <div key={prog.program} className={cn("bg-card border border-border rounded-2xl p-4 space-y-3", !hasData && "opacity-60")}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-1", getProgramBadgeClass(prog.program))}>
                    {prog.program}
                  </span>
                  {programDef && (
                    <p className="text-[10px] text-muted-foreground">{programDef.childTransformation}</p>
                  )}
                </div>
                {prog.avgImprovement !== 0 && (
                  <div className={cn("text-sm font-bold shrink-0", prog.avgImprovement > 0 ? "text-emerald-500" : "text-rose-500")}>
                    {prog.avgImprovement > 0 ? "+" : ""}{prog.avgImprovement}% avg
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <StatBox label="Leads" value={prog.totalLeads} />
                <StatBox label="Clients" value={prog.totalClients} />
                <StatBox label="Active" value={prog.activeChildren} />
                <StatBox label="Grads" value={prog.graduates} />
              </div>

              {/* Revenue bar */}
              {prog.totalRevenue > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Revenue</span>
                    <span className="text-xs font-bold text-foreground">£{prog.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(prog.totalRevenue / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Improvement bar */}
              {prog.avgImprovement !== 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Avg Improvement</span>
                    <span className={cn("text-xs font-bold", prog.avgImprovement > 0 ? "text-emerald-500" : "text-rose-500")}>
                      {prog.avgImprovement > 0 ? "+" : ""}{prog.avgImprovement}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", prog.avgImprovement > 0 ? "bg-emerald-500" : "bg-rose-400")}
                      style={{ width: `${(Math.abs(prog.avgImprovement) / maxImprovement) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Goals achieved */}
              {prog.totalGoals > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground">{prog.goalsAchieved}/{prog.totalGoals} goals achieved</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(prog.goalsAchieved / prog.totalGoals) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Top outcomes */}
              {prog.topOutcomes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {prog.topOutcomes.map(o => (
                    <span key={o} className="text-[9px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg">
                      {o}
                    </span>
                  ))}
                </div>
              )}

              {/* Testimonials */}
              {prog.testimonialCount > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {prog.testimonialCount} published testimonial{prog.testimonialCount > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {!hasData && (
                <p className="text-[10px] text-muted-foreground">No data yet for this program.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        {icon}
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-xl py-2">
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
