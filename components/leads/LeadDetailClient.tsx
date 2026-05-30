"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Phone, Mail, Trash2, Save, Link2, Clock,
  CheckCircle2, UserCheck, PhoneCall, PhoneIncoming,
  MessageCircle, Users, Share2, Youtube, UserPlus
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Lead, LeadStage, LeadSource } from "./LeadPipelineClient";

interface Activity {
  id: string;
  activity_type: "created" | "stage_changed" | "note_added" | "attributed";
  note: string | null;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
}

interface Attribution {
  id: string;
  content_category: string | null;
  youtube_video_id: string | null;
  video_title: string | null;
  tiktok_topic: string | null;
  notes: string | null;
}

interface Props {
  lead: Lead;
  activity: Activity[];
  attribution: Attribution[];
}

const STAGES: { key: LeadStage; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "new_lead",       label: "New Lead",       icon: <Users className="h-4 w-4" />,        color: "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400" },
  { key: "contacted",      label: "Contacted",      icon: <MessageCircle className="h-4 w-4" />, color: "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400" },
  { key: "call_scheduled", label: "Call Scheduled", icon: <PhoneCall className="h-4 w-4" />,    color: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  { key: "call_completed", label: "Call Done",      icon: <PhoneIncoming className="h-4 w-4" />,color: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" },
  { key: "client",         label: "Client",         icon: <UserCheck className="h-4 w-4" />,    color: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
  { key: "follow_up",      label: "Follow Up",      icon: <Clock className="h-4 w-4" />,        color: "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400" },
  { key: "closed",         label: "Closed",         icon: <CheckCircle2 className="h-4 w-4" />, color: "border-zinc-400 bg-zinc-50 text-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-400" },
];

const SOURCES: { value: LeadSource; label: string; icon: React.ReactNode }[] = [
  { value: "tiktok",          label: "TikTok",          icon: <Share2 className="h-3 w-3" /> },
  { value: "youtube",         label: "YouTube",         icon: <Youtube className="h-3 w-3" /> },
  { value: "whatsapp",        label: "WhatsApp",        icon: <MessageCircle className="h-3 w-3" /> },
  { value: "referral",        label: "Referral",        icon: <UserPlus className="h-3 w-3" /> },
  { value: "existing_client", label: "Existing Client", icon: <UserCheck className="h-3 w-3" /> },
  { value: "other",           label: "Other",           icon: <Users className="h-3 w-3" /> },
];

const CATEGORIES = [
  "Parenting Communication", "Discipline", "Emotional Regulation",
  "Islamic Parenting", "Family Relationships", "Child Development", "Other"
];

const ACTIVITY_LABELS: Record<string, string> = {
  created: "Lead created",
  stage_changed: "Stage changed",
  note_added: "Note added",
  attributed: "Content linked",
};

export function LeadDetailClient({ lead: initial, activity: initialActivity, attribution: initialAttribution }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState(initial);
  const [activity, setActivity] = useState(initialActivity);
  const [attribution, setAttribution] = useState(initialAttribution);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit fields
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone || "");
  const [email, setEmail] = useState(lead.email || "");
  const [source, setSource] = useState<LeadSource>(lead.source);
  const [notes, setNotes] = useState(lead.notes || "");

  // Attribution fields
  const [attrCategory, setAttrCategory] = useState(attribution[0]?.content_category || "");
  const [attrVideoTitle, setAttrVideoTitle] = useState(attribution[0]?.video_title || "");
  const [attrYoutubeId, setAttrYoutubeId] = useState(attribution[0]?.youtube_video_id || "");
  const [attrTiktokTopic, setAttrTiktokTopic] = useState(attribution[0]?.tiktok_topic || "");
  const [attrNotes, setAttrNotes] = useState(attribution[0]?.notes || "");

  const isDirty = name !== lead.name || phone !== (lead.phone || "") || email !== (lead.email || "")
    || source !== lead.source || notes !== (lead.notes || "");
  const attrDirty = attrCategory !== (attribution[0]?.content_category || "")
    || attrVideoTitle !== (attribution[0]?.video_title || "")
    || attrYoutubeId !== (attribution[0]?.youtube_video_id || "")
    || attrTiktokTopic !== (attribution[0]?.tiktok_topic || "")
    || attrNotes !== (attribution[0]?.notes || "");

  async function handleStageChange(newStage: LeadStage) {
    if (newStage === lead.stage) return;
    const prev = lead.stage;
    setLead(l => ({ ...l, stage: newStage }));
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error();
      const { lead: updated } = await res.json();
      setLead(updated);
      setActivity(prevActivity => [{ id: Date.now().toString(), activity_type: "stage_changed", note: null, from_stage: prev, to_stage: newStage, created_at: new Date().toISOString() }, ...prevActivity]);
      toast({ title: `Moved to ${STAGES.find(s => s.key === newStage)?.label}` });
    } catch {
      setLead(l => ({ ...l, stage: prev }));
      toast({ title: "Could not update stage", variant: "destructive" as never });
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name, phone: phone || null, email: email || null, source, notes: notes || null };
      if (attrDirty && attrCategory) {
        body.attribution = { content_category: attrCategory, youtube_video_id: attrYoutubeId || null, video_title: attrVideoTitle || null, tiktok_topic: attrTiktokTopic || null, attr_notes: attrNotes || null };
      }
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const { lead: updated } = await res.json();
      setLead(updated);
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Could not save", variant: "destructive" as never });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      router.push("/leads");
      toast({ title: "Lead deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" as never });
      setDeleting(false);
    }
  }

  const currentStageConfig = STAGES.find(s => s.key === lead.stage);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto animate-fade-in">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Back to Pipeline
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">{lead.name[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{lead.name}</h1>
          <div className={cn("inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-xl text-xs font-medium border", currentStageConfig?.color)}>
            {currentStageConfig?.icon}
            {currentStageConfig?.label}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Stage selector */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Move Stage</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {STAGES.map(({ key, label, icon, color }) => (
            <button
              key={key}
              onClick={() => handleStageChange(key)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl border text-xs font-medium transition-all duration-150",
                lead.stage === key ? color : "border-border/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {icon}
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lead Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead Info</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44..." type="tel" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." type="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Where they found you</Label>
              <Select value={source} onValueChange={v => setSource(v as LeadSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">{s.icon}{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What are they looking for? Challenges?" rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Attribution */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content Attribution</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Which content brought this person to you?</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Content Category</Label>
              <Select value={attrCategory} onValueChange={setAttrCategory}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Video Title (optional)</Label>
              <Input value={attrVideoTitle} onChange={e => setAttrVideoTitle(e.target.value)} placeholder="e.g. 5 Ways to Handle Teen Arguments" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">YouTube Video ID</Label>
                <Input value={attrYoutubeId} onChange={e => setAttrYoutubeId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TikTok Topic</Label>
                <Input value={attrTiktokTopic} onChange={e => setAttrTiktokTopic(e.target.value)} placeholder="e.g. discipline video" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={attrNotes} onChange={e => setAttrNotes(e.target.value)} placeholder="Anything specific they mentioned?" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {(isDirty || attrDirty) && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      )}

      {/* Activity Timeline */}
      {activity.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity</p>
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium">
                    {ACTIVITY_LABELS[a.activity_type] || a.activity_type}
                    {a.from_stage && a.to_stage && (
                      <span className="text-muted-foreground font-normal"> — {a.from_stage.replace("_", " ")} → {a.to_stage.replace("_", " ")}</span>
                    )}
                  </p>
                  {a.note && <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>}
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">{formatDate(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
