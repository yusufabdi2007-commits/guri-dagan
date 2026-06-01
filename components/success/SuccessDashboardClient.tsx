"use client";

import Link from "next/link";
import { TrendingUp, Award, AlertTriangle, MessageSquareQuote, BookOpen, Users, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass } from "@/lib/programs";

interface ChildSummary {
  id: string;
  child_name: string;
  age: number | null;
  program: string | null;
  status: string;
  start_date: string;
  graduation_date: string | null;
  enrollment_id: string | null;
  milestoneCount: number;
  goalCount: number;
  achievedGoals: number;
  checkinCount: number;
  latestCheckinDate: string | null;
  progressPct: number;
  improvementPct: number;
  atRisk: boolean;
  atRiskReason: string | null;
  hasStory: boolean;
  storyStatus: string | null;
  readyForTestimonial: boolean;
}

interface Props {
  childSummaries: ChildSummary[];
  atRiskChildren: ChildSummary[];
  testimonialReady: ChildSummary[];
  avgImprovement: number;
  totalMilestones: number;
  publishedStories: number;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500",
    graduated: "bg-violet-500",
    paused: "bg-amber-500",
    withdrawn: "bg-zinc-400",
  };
  return <span className={cn("w-2 h-2 rounded-full inline-block", colors[status] ?? "bg-zinc-400")} />;
}

export function SuccessDashboardClient({ childSummaries, atRiskChildren, testimonialReady, avgImprovement, totalMilestones, publishedStories }: Props) {
  const active = childSummaries.filter(c => c.status === "active");
  const graduated = childSummaries.filter(c => c.status === "graduated");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active Children" value={active.length} icon={<Users className="h-4 w-4 text-emerald-500" />} color="emerald" />
        <KpiCard label="Graduated" value={graduated.length} icon={<Award className="h-4 w-4 text-violet-500" />} color="violet" />
        <KpiCard label="Avg Improvement" value={`${avgImprovement > 0 ? "+" : ""}${avgImprovement}%`} icon={<TrendingUp className="h-4 w-4 text-sky-500" />} color="sky" />
        <KpiCard label="Milestones" value={totalMilestones} icon={<Star className="h-4 w-4 text-amber-500" />} color="amber" />
      </div>

      {/* At-risk alert */}
      {atRiskChildren.length > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <p className="text-sm font-semibold text-foreground">{atRiskChildren.length} child{atRiskChildren.length > 1 ? "ren" : ""} at risk</p>
          </div>
          {atRiskChildren.map(child => (
            <Link key={child.id} href={`/children/${child.id}`} className="flex items-center gap-3 bg-background/60 border border-rose-500/10 rounded-xl p-3 hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-rose-600 font-bold text-sm">{child.child_name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{child.child_name}</p>
                <p className="text-[10px] text-rose-500 mt-0.5">{child.atRiskReason}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {/* Testimonial ready */}
      {testimonialReady.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquareQuote className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-foreground">{testimonialReady.length} ready for testimonial</p>
          </div>
          {testimonialReady.slice(0, 3).map(child => (
            <Link key={child.id} href={`/children/${child.id}`} className="flex items-center gap-3 bg-background/60 border border-emerald-500/10 rounded-xl p-3 hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-emerald-600 font-bold text-sm">{child.child_name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{child.child_name}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {child.improvementPct > 0 ? `+${child.improvementPct}% improvement` : child.status === "graduated" ? "Graduated" : `${child.milestoneCount} milestones`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {/* Success stories */}
      {publishedStories > 0 && (
        <div className="flex items-center gap-3 bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4">
          <BookOpen className="h-5 w-5 text-violet-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{publishedStories} success {publishedStories === 1 ? "story" : "stories"} published</p>
            <p className="text-[10px] text-muted-foreground">Ready to use in marketing</p>
          </div>
          <Link href="/children" className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">View all</Link>
        </div>
      )}

      {/* All children */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Children ({childSummaries.length})</p>
          <Link href="/children" className="text-xs text-primary hover:underline">See directory</Link>
        </div>

        {childSummaries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No children yet</p>
            <p className="text-xs text-muted-foreground mb-4">When you enroll a client, their child profile appears here.</p>
            <Link href="/clients" className="text-xs font-medium text-primary hover:underline">Go to Clients</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {childSummaries.slice(0, 10).map(child => (
              <Link key={child.id} href={`/children/${child.id}`} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">{child.child_name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusDot status={child.status} />
                    <p className="text-sm font-semibold text-foreground truncate">{child.child_name}</p>
                    {child.age && <span className="text-[10px] text-muted-foreground">Age {child.age}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {child.program && (
                      <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", getProgramBadgeClass(child.program))}>
                        {child.program.split(" ")[0]}
                      </span>
                    )}
                    {child.progressPct > 0 && (
                      <span className="text-[10px] text-muted-foreground">{child.progressPct}% goals done</span>
                    )}
                    {child.improvementPct !== 0 && (
                      <span className={cn("text-[10px] font-medium", child.improvementPct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
                        {child.improvementPct > 0 ? "+" : ""}{child.improvementPct}%
                      </span>
                    )}
                    {child.atRisk && <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded">AT RISK</span>}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-12 flex flex-col items-end gap-1 shrink-0">
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", child.progressPct >= 80 ? "bg-emerald-500" : child.progressPct >= 40 ? "bg-sky-500" : "bg-primary")}
                      style={{ width: `${child.progressPct}%` }}
                    />
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {childSummaries.length > 10 && (
              <Link href="/children" className="block text-center py-2 text-xs text-primary hover:underline">
                View all {childSummaries.length} children
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const bg: Record<string, string> = {
    emerald: "bg-emerald-500/5 border-emerald-500/20",
    violet: "bg-violet-500/5 border-violet-500/20",
    sky: "bg-sky-500/5 border-sky-500/20",
    amber: "bg-amber-500/5 border-amber-500/20",
  };
  return (
    <div className={cn("border rounded-2xl p-3 flex flex-col gap-2", bg[color])}>
      <div className="flex items-center justify-between">
        {icon}
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
      <p className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
