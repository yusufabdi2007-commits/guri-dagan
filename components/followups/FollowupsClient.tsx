"use client";

import Link from "next/link";
import { Clock, PhoneCall, UserCheck, PoundSterling, MessageSquareQuote, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass } from "@/lib/programs";

interface StaleLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  program: string | null;
  source: string;
  stage: string;
  created_at: string;
  notes: string | null;
}

interface ConsultationFollowup {
  id: string;
  scheduled_at: string;
  outcome: string | null;
  notes: string | null;
  leads: { id: string; name: string; phone: string | null; program: string | null } | null;
}

interface PausedClient {
  id: string;
  parent_name: string;
  child_name: string | null;
  program: string | null;
  enrollment_date: string;
  status: string;
}

interface OverduePayment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  client_enrollments: { id: string; parent_name: string; program: string | null } | null;
}

interface OutstandingTestimonial {
  id: string;
  requested_at: string;
  client_enrollments: { id: string; parent_name: string; program: string | null } | null;
}

interface AtRiskChild {
  id: string;
  child_name: string;
  program: string | null;
  enrollment_id: string | null;
  reason: string;
}

interface Props {
  staleLeads: StaleLead[];
  consultationsNeedingFollowup: ConsultationFollowup[];
  pausedClients: PausedClient[];
  overduePayments: OverduePayment[];
  outstandingTestimonials: OutstandingTestimonial[];
  atRiskChildren: AtRiskChild[];
}

function daysAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  return diff === 0 ? "today" : diff === 1 ? "yesterday" : `${diff} days ago`;
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  );
}

export function FollowupsClient({ staleLeads, consultationsNeedingFollowup, pausedClients, overduePayments, outstandingTestimonials, atRiskChildren }: Props) {
  const total = staleLeads.length + consultationsNeedingFollowup.length + pausedClients.length + overduePayments.length + outstandingTestimonials.length + atRiskChildren.length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Summary */}
      <div className={cn(
        "border rounded-2xl p-4",
        total === 0
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-amber-500/5 border-amber-500/20"
      )}>
        <div className="flex items-center gap-3">
          {total === 0
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            : <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          }
          <div>
            <p className="text-sm font-semibold text-foreground">
              {total === 0 ? "All caught up!" : `${total} item${total > 1 ? "s" : ""} need attention`}
            </p>
            <p className="text-xs text-muted-foreground">
              {total === 0 ? "No follow-ups pending right now." : "Review each section below and take action."}
            </p>
          </div>
        </div>
      </div>

      {/* At-risk children */}
      <Section
        title="At-risk children"
        count={atRiskChildren.length}
        icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
      >
        <div className="space-y-2">
          {atRiskChildren.map(child => (
            <Link key={child.id} href={`/children/${child.id}`} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-rose-600 font-bold text-sm">{child.child_name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{child.child_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-rose-500">{child.reason}</span>
                  {child.program && (
                    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", getProgramBadgeClass(child.program))}>
                      {child.program.split(" ")[0]}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </Section>

      {/* Stale leads */}
      <Section
        title="Leads not contacted for 7+ days"
        count={staleLeads.length}
        icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
      >
        <div className="space-y-2">
          {staleLeads.map(lead => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-amber-600 font-bold text-sm">{lead.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Last seen {daysAgo(lead.created_at)}</span>
                  {lead.program && (
                    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", getProgramBadgeClass(lead.program))}>
                      {lead.program.split(" ")[0]}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground capitalize">{lead.stage.replace("_", " ")}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </Section>

      {/* Consultations needing follow-up */}
      <Section
        title="Consultations needing follow-up"
        count={consultationsNeedingFollowup.length}
        icon={<PhoneCall className="h-3.5 w-3.5 text-rose-500" />}
      >
        <div className="space-y-2">
          {consultationsNeedingFollowup.map(c => (
            <Link key={c.id} href={c.leads ? `/leads/${c.leads.id}` : "/consultations"} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                <PhoneCall className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{c.leads?.name ?? "Unknown Lead"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.outcome === "no_show" ? "No show" : "Follow-up needed"} — {daysAgo(c.scheduled_at)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </Section>

      {/* Paused clients */}
      <Section
        title="Paused clients"
        count={pausedClients.length}
        icon={<UserCheck className="h-3.5 w-3.5 text-violet-500" />}
      >
        <div className="space-y-2">
          {pausedClients.map(client => (
            <Link key={client.id} href={`/clients/${client.id}`} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-violet-600 font-bold text-sm">{client.parent_name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{client.parent_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {client.program && (
                    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", getProgramBadgeClass(client.program))}>
                      {client.program.split(" ")[0]}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">Enrolled {daysAgo(client.enrollment_date)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </Section>

      {/* Overdue payments */}
      <Section
        title="Overdue payments"
        count={overduePayments.length}
        icon={<PoundSterling className="h-3.5 w-3.5 text-rose-500" />}
      >
        <div className="space-y-2">
          {overduePayments.map(p => {
            const enr = p.client_enrollments as { id: string; parent_name: string; program: string | null } | null;
            return (
              <Link key={p.id} href={enr ? `/clients/${enr.id}` : "/clients"} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <PoundSterling className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{enr?.parent_name ?? "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">£{p.amount.toLocaleString()} due {daysAgo(p.payment_date)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Outstanding testimonials */}
      <Section
        title="Outstanding testimonials"
        count={outstandingTestimonials.length}
        icon={<MessageSquareQuote className="h-3.5 w-3.5 text-sky-500" />}
      >
        <div className="space-y-2">
          {outstandingTestimonials.map(t => {
            const enr = t.client_enrollments as { id: string; parent_name: string; program: string | null } | null;
            return (
              <Link key={t.id} href={enr ? `/clients/${enr.id}` : "/clients"} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquareQuote className="h-4 w-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{enr?.parent_name ?? "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Requested {daysAgo(t.requested_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      </Section>

      {total === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">Everything is up to date. Check back tomorrow.</p>
        </div>
      )}
    </div>
  );
}
