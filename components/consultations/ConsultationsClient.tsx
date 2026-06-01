"use client";

import { useState } from "react";
import {
  PhoneCall, PhoneIncoming, Clock, CheckCircle2, XCircle,
  Plus, Calendar, Users, Shield, ChevronDown, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { getProgramBadgeClass } from "@/lib/programs";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  program: string | null;
  source: string;
  stage: string;
}

interface Consultation {
  id: string;
  lead_id: string | null;
  scheduled_at: string;
  completed_at: string | null;
  outcome: "enrolled" | "follow_up" | "no_show" | "not_interested" | null;
  notes: string | null;
  leads: Lead | null;
}

interface Props {
  consultations: Consultation[];
  leads: Lead[];
}

const OUTCOME_CONFIG = {
  enrolled: { label: "Enrolled", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400", icon: <UserCheck className="h-3 w-3" /> },
  follow_up: { label: "Follow Up", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400", icon: <Clock className="h-3 w-3" /> },
  no_show: { label: "No Show", color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400", icon: <XCircle className="h-3 w-3" /> },
  not_interested: { label: "Not Interested", color: "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800 dark:text-zinc-400", icon: <XCircle className="h-3 w-3" /> },
};

export function ConsultationsClient({ consultations: initial, leads }: Props) {
  const [consultations, setConsultations] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lead_id: "",
    scheduled_at: "",
    notes: "",
  });

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const upcoming = consultations.filter(c => !c.completed_at && new Date(c.scheduled_at) >= now);
  const today = upcoming.filter(c => c.scheduled_at.startsWith(todayStr));
  const thisWeek = upcoming.filter(c => {
    const d = new Date(c.scheduled_at);
    return d >= now && d <= weekEnd && !c.scheduled_at.startsWith(todayStr);
  });
  const past = consultations.filter(c => c.completed_at || new Date(c.scheduled_at) < now);

  async function handleAdd() {
    if (!form.scheduled_at) {
      toast({ title: "Please select a date and time", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: form.lead_id || null,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { consultation } = await res.json();
      setConsultations(prev => [consultation, ...prev]);
      setForm({ lead_id: "", scheduled_at: "", notes: "" });
      setShowForm(false);
      toast({ title: "Consultation scheduled" });
    } catch {
      toast({ title: "Could not schedule", variant: "destructive" as never });
    } finally {
      setSaving(false);
    }
  }

  async function handleOutcome(consultationId: string, outcome: string) {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, completed_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      const { consultation } = await res.json();
      setConsultations(prev => prev.map(c => c.id === consultationId ? consultation : c));
      toast({ title: `Marked as ${OUTCOME_CONFIG[outcome as keyof typeof OUTCOME_CONFIG]?.label}` });
    } catch {
      toast({ title: "Could not update", variant: "destructive" as never });
    }
  }

  function ConsultationCard({ c }: { c: Consultation }) {
    const isExpanded = expandedId === c.id;
    const outcomeConfig = c.outcome ? OUTCOME_CONFIG[c.outcome] : null;
    const isPast = c.completed_at || new Date(c.scheduled_at) < now;

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedId(isExpanded ? null : c.id)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        >
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isPast ? "bg-muted" : "bg-primary/10")}>
            {isPast ? <PhoneIncoming className="h-4 w-4 text-muted-foreground" /> : <PhoneCall className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {c.leads?.name ?? "Unknown Lead"}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(c.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              {c.leads?.program && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1", getProgramBadgeClass(c.leads.program))}>
                  <Shield className="h-2 w-2" />{c.leads.program}
                </span>
              )}
              {outcomeConfig && (
                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1", outcomeConfig.color)}>
                  {outcomeConfig.icon}{outcomeConfig.label}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
        </button>

        {isExpanded && (
          <div className="border-t border-border bg-muted/20 p-4 space-y-3">
            {c.leads?.phone && (
              <a href={`tel:${c.leads.phone}`} className="text-xs text-primary font-medium hover:underline block">{c.leads.phone}</a>
            )}
            {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}

            {!c.completed_at && !c.outcome && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mark Outcome</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => handleOutcome(c.id, key)}
                      className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors hover:opacity-80", cfg.color)}
                    >
                      {cfg.icon}{cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: consultations.length, icon: <PhoneCall className="h-4 w-4 text-violet-500" /> },
          { label: "Upcoming", value: upcoming.length, icon: <Calendar className="h-4 w-4 text-sky-500" /> },
          { label: "Enrolled", value: consultations.filter(c => c.outcome === "enrolled").length, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Schedule button */}
      <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2">
        <Plus className="h-4 w-4" />Schedule Consultation
      </Button>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">New Consultation</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" />Lead</Label>
              <Select value={form.lead_id} onValueChange={v => setForm(f => ({ ...f, lead_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select lead..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No lead linked</SelectItem>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name} {l.program ? `— ${l.program}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Date & Time *</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                placeholder="What to discuss..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving} className="flex-1">
              {saving ? "Scheduling..." : "Schedule"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Today */}
      {today.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today</p>
          {today.map(c => <ConsultationCard key={c.id} c={c} />)}
        </div>
      )}

      {/* This Week */}
      {thisWeek.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week</p>
          {thisWeek.map(c => <ConsultationCard key={c.id} c={c} />)}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past</p>
          {past.map(c => <ConsultationCard key={c.id} c={c} />)}
        </div>
      )}

      {consultations.length === 0 && !showForm && (
        <div className="text-center py-16">
          <PhoneCall className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No consultations yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Schedule a call with a lead to get started</p>
        </div>
      )}
    </div>
  );
}
