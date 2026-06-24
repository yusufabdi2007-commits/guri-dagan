"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Phone, Mail, ChevronRight, Users, TrendingUp, UserCheck,
  Youtube, MessageCircle, Share2, UserPlus, Clock, Shield, ChevronDown,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PROGRAMS, getProgramBadgeClass } from "@/lib/programs";

export type LeadStage = "new_lead" | "contacted" | "call_scheduled" | "call_completed" | "client" | "follow_up" | "closed";
export type LeadSource = "tiktok" | "youtube" | "whatsapp" | "referral" | "existing_client" | "other";

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  stage: LeadStage;
  notes: string | null;
  program: string | null;
  created_at: string;
  updated_at: string;
  content_attribution?: Array<{
    id: string;
    content_category: string | null;
    youtube_video_id: string | null;
    video_title: string | null;
    tiktok_topic: string | null;
    program: string | null;
  }>;
}

interface Props {
  leads: Lead[];
  userId: string;
}

const STAGES: { key: LeadStage; label: string; color: string; bg: string; dot: string }[] = [
  { key: "new_lead",       label: "New Lead",      color: "text-sky-600 dark:text-sky-400",      bg: "bg-sky-500/10",     dot: "bg-sky-500" },
  { key: "contacted",      label: "Contacted",     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", dot: "bg-violet-500" },
  { key: "call_scheduled", label: "Call Booked",   color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10",   dot: "bg-amber-500" },
  { key: "call_completed", label: "Call Done",     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-500" },
  { key: "client",         label: "Client",        color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  { key: "follow_up",      label: "Follow Up",     color: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-500/10",    dot: "bg-rose-500" },
  { key: "closed",         label: "Closed",        color: "text-zinc-500",                        bg: "bg-zinc-500/10",   dot: "bg-zinc-400" },
];

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "tiktok",          label: "TikTok" },
  { value: "youtube",         label: "YouTube" },
  { value: "whatsapp",        label: "WhatsApp" },
  { value: "referral",        label: "Referral" },
  { value: "existing_client", label: "Existing Client" },
  { value: "other",           label: "Other" },
];

const SOURCE_ICON: Record<LeadSource, React.ReactNode> = {
  tiktok:          <Share2 className="h-3 w-3" />,
  youtube:         <Youtube className="h-3 w-3" />,
  whatsapp:        <MessageCircle className="h-3 w-3" />,
  referral:        <UserPlus className="h-3 w-3" />,
  existing_client: <UserCheck className="h-3 w-3" />,
  other:           <Users className="h-3 w-3" />,
};

const PROGRAM_OPTIONS = Object.keys(PROGRAMS) as (keyof typeof PROGRAMS)[];
const emptyForm = { name: "", phone: "", email: "", source: "other" as LeadSource, notes: "", program: "" };

function sourceLabel(s: LeadSource) {
  return SOURCES.find(x => x.value === s)?.label ?? s;
}

export function LeadPipelineClient({ leads: initial }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [activeStage, setActiveStage] = useState<LeadStage | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const filtered = useCallback(() =>
    activeStage === "all" ? leads : leads.filter(l => l.stage === activeStage),
  [leads, activeStage]);

  async function handleMoveStage(leadId: string, newStage: LeadStage) {
    const prev = leads.find(l => l.id === leadId)?.stage;
    if (!prev || prev === newStage) return;
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    setMovingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }
      toast({ title: `Moved to ${STAGES.find(s => s.key === newStage)?.label}` });
    } catch (err) {
      setLeads(ls => ls.map(l => l.id === leadId ? { ...l, stage: prev } : l));
      toast({ title: "Could not move lead", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" as never });
    } finally {
      setMovingId(null);
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source,
        notes: form.notes || null,
      };
      if (form.program) body.program = form.program;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }
      const { lead } = await res.json();
      setLeads(prev => [lead, ...prev]);
      setForm(emptyForm);
      setDialogOpen(false);
      toast({ title: "Lead added" });
    } catch (err) {
      toast({ title: "Could not add lead", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" as never });
    } finally {
      setSaving(false);
    }
  }

  const totalLeads = leads.length;
  const clients = leads.filter(l => l.stage === "client").length;
  const callsScheduled = leads.filter(l => l.stage === "call_scheduled").length;
  const conversionRate = totalLeads > 0 ? Math.round((clients / totalLeads) * 100) : 0;
  const visibleLeads = filtered();

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Stats */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: totalLeads, icon: <Users className="h-4 w-4 text-sky-500" /> },
          { label: "Calls", value: callsScheduled, icon: <Clock className="h-4 w-4 text-amber-500" /> },
          { label: "Clients", value: clients, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
          { label: "Rate", value: `${conversionRate}%`, icon: <TrendingUp className="h-4 w-4 text-primary" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-2.5 flex flex-col items-center gap-1 text-center">
            {icon}
            <div className="text-base font-bold text-foreground">{value}</div>
            <div className="text-[9px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Stage filter tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
          <button
            onClick={() => setActiveStage("all")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              activeStage === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            All ({totalLeads})
          </button>
          {STAGES.map(s => {
            const count = leads.filter(l => l.stage === s.key).length;
            return (
              <button
                key={s.key}
                onClick={() => setActiveStage(s.key)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeStage === s.key ? `${s.bg} ${s.color}` : "bg-muted text-muted-foreground"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                {s.label}
                {count > 0 && <span className="font-bold">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add button */}
      <div className="px-4 pb-2 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Lead
        </Button>
      </div>

      {/* Lead list */}
      <div className="px-4 flex flex-col gap-2">
        {visibleLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No leads here yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tap Add Lead to get started</p>
          </div>
        )}

        {visibleLeads.map(lead => {
          const stageInfo = STAGES.find(s => s.key === lead.stage)!;
          return (
            <div key={lead.id} className="bg-card border border-border rounded-2xl p-4">
              {/* Top row */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{lead.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground leading-tight">{lead.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {SOURCE_ICON[lead.source]}
                      {sourceLabel(lead.source)}
                    </span>
                    {lead.program && (
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5", getProgramBadgeClass(lead.program))}>
                        <Shield className="h-2 w-2" />
                        {lead.program.replace("™", "")}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Contact row */}
              {(lead.phone || lead.email) && (
                <div className="flex items-center gap-3 mb-3">
                  {lead.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />{lead.phone}
                    </span>
                  )}
                  {lead.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />{lead.email}
                    </span>
                  )}
                </div>
              )}

              {/* Stage selector */}
              <div className="flex items-center gap-2">
                <Select
                  value={lead.stage}
                  onValueChange={v => handleMoveStage(lead.id, v as LeadStage)}
                  disabled={movingId === lead.id}
                >
                  <SelectTrigger className={cn("h-8 text-xs font-semibold rounded-xl border-0 flex-1", stageInfo.bg, stageInfo.color)}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", stageInfo.dot)} />
                      <SelectValue />
                    </div>
                    <ChevronDown className="h-3 w-3 ml-auto opacity-60" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.key} value={s.key}>
                        <span className={cn("font-medium", s.color)}>{s.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(lead.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Fadumo Hassan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+44..." type="tel" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Where did they find you?</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v as LeadSource }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary" />Which program attracted them?</Label>
              <Select value={form.program} onValueChange={v => setForm(f => ({ ...f, program: v }))}>
                <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown</SelectItem>
                  {PROGRAM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What are they looking for?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Add Lead"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
