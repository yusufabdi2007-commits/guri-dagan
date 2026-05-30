"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Phone, Mail, ChevronRight, Users, TrendingUp, UserCheck,
  Youtube, MessageCircle, Share2, UserPlus, ExternalLink, Clock
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

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
  created_at: string;
  updated_at: string;
  content_attribution?: Array<{
    id: string;
    content_category: string | null;
    youtube_video_id: string | null;
    video_title: string | null;
    tiktok_topic: string | null;
  }>;
}

interface Props {
  leads: Lead[];
  userId: string;
}

const STAGES: { key: LeadStage; label: string; color: string; bg: string }[] = [
  { key: "new_lead",       label: "New Lead",       color: "text-sky-600 dark:text-sky-400",     bg: "bg-sky-500/10" },
  { key: "contacted",      label: "Contacted",      color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  { key: "call_scheduled", label: "Call Scheduled", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { key: "call_completed", label: "Call Done",      color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  { key: "client",         label: "Client",         color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "follow_up",      label: "Follow Up",      color: "text-rose-600 dark:text-rose-400",   bg: "bg-rose-500/10" },
  { key: "closed",         label: "Closed",         color: "text-zinc-500",                      bg: "bg-zinc-500/10" },
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

const emptyForm = { name: "", phone: "", email: "", source: "other" as LeadSource, notes: "" };

function sourceLabel(s: LeadSource) {
  return SOURCES.find(x => x.value === s)?.label ?? s;
}

export function LeadPipelineClient({ leads: initial, userId }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Group leads by stage
  const byStage = useCallback((stage: LeadStage) => leads.filter(l => l.stage === stage), [leads]);

  // Drag end: optimistic update + API patch
  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId as LeadStage;
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage: newStage } : l));

    try {
      const res = await fetch(`/api/leads/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage: source.droppableId as LeadStage } : l));
      toast({ title: "Could not move lead", variant: "destructive" as never });
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: form.phone || null, email: form.email || null, notes: form.notes || null }),
      });
      if (!res.ok) throw new Error();
      const { lead } = await res.json();
      setLeads(prev => [lead, ...prev]);
      setForm(emptyForm);
      setDialogOpen(false);
      toast({ title: "Lead added" });
    } catch {
      toast({ title: "Could not add lead", variant: "destructive" as never });
    } finally {
      setSaving(false);
    }
  }

  const totalLeads = leads.length;
  const clients = leads.filter(l => l.stage === "client").length;
  const callsScheduled = leads.filter(l => l.stage === "call_scheduled").length;
  const conversionRate = totalLeads > 0 ? Math.round((clients / totalLeads) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Summary bar */}
      <div className="px-4 md:px-6 pt-4 pb-2 grid grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: totalLeads, icon: <Users className="h-4 w-4 text-sky-500" /> },
          { label: "Calls Booked", value: callsScheduled, icon: <Clock className="h-4 w-4 text-amber-500" /> },
          { label: "Clients", value: clients, icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
          { label: "Conversion", value: `${conversionRate}%`, icon: <TrendingUp className="h-4 w-4 text-primary" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
            {icon}
            <div className="text-lg font-bold text-foreground">{value}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Add lead button */}
      <div className="px-4 md:px-6 py-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Drag cards between stages to update</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Lead
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto pb-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 px-4 md:px-6 min-w-max pb-4">
            {STAGES.map(({ key, label, color, bg }) => {
              const stageLeads = byStage(key);
              return (
                <div key={key} className="flex flex-col w-[220px] shrink-0">
                  {/* Column header */}
                  <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl mb-2", bg)}>
                    <span className={cn("text-xs font-semibold", color)}>{label}</span>
                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-lg bg-background/60", color)}>{stageLeads.length}</span>
                  </div>

                  <Droppable droppableId={key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex flex-col gap-2 flex-1 min-h-[120px] rounded-xl transition-colors duration-150 p-1",
                          snapshot.isDraggingOver && "bg-primary/5"
                        )}
                      >
                        {stageLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={cn(
                                  "bg-card border border-border rounded-2xl p-3 cursor-pointer group transition-all duration-150",
                                  snap.isDragging && "shadow-lg ring-2 ring-primary/30 rotate-1"
                                )}
                                onClick={() => router.push(`/leads/${lead.id}`)}
                              >
                                {/* Name */}
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="w-6 h-6 gradient-primary rounded-lg flex items-center justify-center shrink-0">
                                    <span className="text-white font-bold text-[10px]">{lead.name[0]?.toUpperCase()}</span>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-sm font-semibold text-foreground leading-tight mb-1.5 line-clamp-2">{lead.name}</p>

                                {/* Source badge */}
                                <div className="flex items-center gap-1 mb-1.5">
                                  <span className="flex items-center gap-1 text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-lg font-medium">
                                    {SOURCE_ICON[lead.source]}
                                    {sourceLabel(lead.source)}
                                  </span>
                                  {lead.content_attribution && lead.content_attribution.length > 0 && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg font-medium">
                                      attributed
                                    </span>
                                  )}
                                </div>

                                {/* Contact icons */}
                                <div className="flex items-center gap-1.5 text-muted-foreground/50">
                                  {lead.phone && <Phone className="h-3 w-3" />}
                                  {lead.email && <Mail className="h-3 w-3" />}
                                  <span className="text-[10px] ml-auto">{formatDate(lead.created_at)}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {stageLeads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-border/40">
                            <span className="text-[10px] text-muted-foreground/40">Drop here</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
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
