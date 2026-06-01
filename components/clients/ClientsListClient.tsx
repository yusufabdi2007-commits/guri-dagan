"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserCheck, Shield, Calendar, PoundSterling,
  MessageSquareQuote, ChevronRight, Plus, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass } from "@/lib/programs";
import { toast } from "@/components/ui/use-toast";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_status: string;
}

interface TestimonialRequest {
  id: string;
  status: string;
  requested_at: string;
  received_at: string | null;
}

interface Enrollment {
  id: string;
  parent_name: string;
  child_name: string | null;
  program: string | null;
  enrollment_date: string;
  status: "active" | "completed" | "paused" | "cancelled";
  notes: string | null;
  leads: { id: string; name: string; phone: string | null; email: string | null; source: string; program: string | null } | null;
  payments: Payment[];
  testimonial_requests: TestimonialRequest[];
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" },
  completed: { label: "Completed", color: "text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400" },
  paused: { label: "Paused", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400" },
  cancelled: { label: "Cancelled", color: "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800 dark:text-zinc-400" },
};

type FilterStatus = "all" | "active" | "completed" | "paused" | "cancelled";

export function ClientsListClient({ enrollments: initial }: { enrollments: Enrollment[] }) {
  const [enrollments, setEnrollments] = useState(initial);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const filtered = filter === "all" ? enrollments : enrollments.filter(e => e.status === filter);

  const totalRevenue = enrollments
    .flatMap(e => e.payments)
    .filter(p => p.payment_status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const activeCount = enrollments.filter(e => e.status === "active").length;
  const pendingTestimonials = enrollments.filter(e =>
    e.status === "active" || e.status === "completed"
  ).filter(e => e.testimonial_requests.length === 0 || e.testimonial_requests.every(r => r.status !== "received")).length;

  async function handleRequestTestimonial(enrollmentId: string) {
    setRequestingId(enrollmentId);
    try {
      const res = await fetch("/api/testimonial-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: enrollmentId }),
      });
      if (!res.ok) throw new Error();
      const { request } = await res.json();
      setEnrollments(prev => prev.map(e =>
        e.id === enrollmentId
          ? { ...e, testimonial_requests: [...e.testimonial_requests, request] }
          : e
      ));
      toast({ title: "Testimonial request logged" });
    } catch {
      toast({ title: "Could not log request", variant: "destructive" as never });
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active", value: activeCount, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
          { label: "Revenue", value: `£${totalRevenue.toLocaleString()}`, icon: <PoundSterling className="h-4 w-4 text-violet-500" /> },
          { label: "Testimonials", value: `${enrollments.flatMap(e => e.testimonial_requests).filter(r => r.status === "received").length}`, icon: <MessageSquareQuote className="h-4 w-4 text-amber-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {pendingTestimonials > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-3">
          <MessageSquareQuote className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-foreground flex-1">
            <span className="font-semibold">{pendingTestimonials} client{pendingTestimonials > 1 ? "s" : ""}</span> ready to be asked for a testimonial
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "active", "completed", "paused", "cancelled"] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "text-[11px] font-medium px-3 py-1 rounded-full border transition-colors capitalize",
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {s === "all" ? `All (${enrollments.length})` : `${s} (${enrollments.filter(e => e.status === s).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(enrollment => {
          const statusCfg = STATUS_CONFIG[enrollment.status];
          const totalPaid = enrollment.payments
            .filter(p => p.payment_status === "paid")
            .reduce((sum, p) => sum + p.amount, 0);
          const hasTestimonialRequest = enrollment.testimonial_requests.length > 0;
          const hasReceivedTestimonial = enrollment.testimonial_requests.some(r => r.status === "received");

          return (
            <div key={enrollment.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <Link
                href={`/clients/${enrollment.id}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{enrollment.parent_name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{enrollment.parent_name}</p>
                    <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded border", statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                  </div>
                  {enrollment.child_name && (
                    <p className="text-[11px] text-muted-foreground">Child: {enrollment.child_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {enrollment.program && (
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1", getProgramBadgeClass(enrollment.program))}>
                        <Shield className="h-2 w-2" />{enrollment.program}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(enrollment.enrollment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {totalPaid > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        £{totalPaid.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>

              {/* Testimonial row */}
              {(enrollment.status === "active" || enrollment.status === "completed") && !hasReceivedTestimonial && (
                <div className="px-4 pb-3 border-t border-border/50 pt-2 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {hasTestimonialRequest ? "Testimonial requested — awaiting response" : "No testimonial yet"}
                  </p>
                  {!hasTestimonialRequest && (
                    <button
                      onClick={() => handleRequestTestimonial(enrollment.id)}
                      disabled={requestingId === enrollment.id}
                      className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {requestingId === enrollment.id ? "Requesting..." : "Request Testimonial"}
                    </button>
                  )}
                </div>
              )}
              {hasReceivedTestimonial && (
                <div className="px-4 pb-3 border-t border-border/50 pt-2">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <MessageSquareQuote className="h-3 w-3" />Testimonial received
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <UserCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {filter === "all" ? "No clients enrolled yet" : `No ${filter} clients`}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {filter === "all" ? "Use Convert to Client from a lead's profile" : "Change the filter to see other clients"}
          </p>
        </div>
      )}
    </div>
  );
}
