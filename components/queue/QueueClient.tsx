"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Clock, Film, CheckCircle2, AlertCircle,
  Circle, Pencil, Trash2, Zap, Flame, ChevronUp, ChevronDown
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type QueueStatus = "Not Started" | "Ready" | "Recorded" | "Needs Retake";

interface QueueItem {
  id: string;
  user_id: string;
  title: string;
  hook: string | null;
  status: QueueStatus;
  priority_order: number;
  estimated_duration: number | null;
  filming_notes: string | null;
  tone_tags: string[] | null;
  category: string | null;
  idea_id: string | null;
}

interface Props {
  items: QueueItem[];
  ideas: { id: string; title: string; hook: string; category: string }[];
  userId: string;
}

const STATUS_CONFIG: Record<QueueStatus, { icon: React.ElementType; color: string; label: string }> = {
  "Not Started": { icon: Circle,       color: "text-muted-foreground bg-muted",                                                    label: "Not Started" },
  "Ready":       { icon: Zap,          color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",                  label: "Ready" },
  "Recorded":    { icon: CheckCircle2, color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",              label: "Recorded" },
  "Needs Retake":{ icon: AlertCircle,  color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",          label: "Needs Retake" },
};

const TONE_OPTIONS = ["Emotional", "Practical", "Motivational", "Storytelling", "Islamic", "Educational", "Funny", "Raw & Honest"];
const STATUSES: QueueStatus[] = ["Not Started", "Ready", "Recorded", "Needs Retake"];

const emptyForm = {
  title: "",
  hook: "",
  status: "Not Started" as QueueStatus,
  estimated_duration: "",
  filming_notes: "",
  tone_tags: [] as string[],
  category: "",
  idea_id: "",
};

export function QueueClient({ items: initial, ideas, userId }: Props) {
  const [items, setItems] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const readyItems    = items.filter(i => i.status === "Ready" || i.status === "Not Started");
  const recordedItems = items.filter(i => i.status === "Recorded");
  const retakeItems   = items.filter(i => i.status === "Needs Retake");

  async function handleMove(index: number, direction: "up" | "down") {
    const newItems = Array.from(items);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;

    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const updated = newItems.map((item, idx) => ({ ...item, priority_order: idx }));
    setItems(updated);

    const supabase = createClient();
    await Promise.all(
      [updated[index], updated[swapIndex]].map(item =>
        supabase.from("recording_queue").update({ priority_order: item.priority_order }).eq("id", item.id)
      )
    );
  }

  function openAdd() {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: QueueItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      hook: item.hook || "",
      status: item.status,
      estimated_duration: item.estimated_duration ? String(item.estimated_duration) : "",
      filming_notes: item.filming_notes || "",
      tone_tags: item.tone_tags || [],
      category: item.category || "",
      idea_id: item.idea_id || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const payload = {
      title: form.title,
      hook: form.hook || null,
      status: form.status,
      estimated_duration: form.estimated_duration ? parseInt(form.estimated_duration) : null,
      filming_notes: form.filming_notes || null,
      tone_tags: form.tone_tags.length ? form.tone_tags : null,
      category: form.category || null,
      idea_id: form.idea_id || null,
    };

    if (editingItem) {
      const { data, error } = await supabase.from("recording_queue").update(payload).eq("id", editingItem.id).select().single();
      if (error) toast({ title: error.message, variant: "destructive" as never });
      else if (data) { setItems(prev => prev.map(i => i.id === data.id ? data : i)); toast({ title: "Updated!" }); }
    } else {
      const { data, error } = await supabase.from("recording_queue")
        .insert({ ...payload, user_id: userId, priority_order: items.length })
        .select().single();
      if (error) toast({ title: error.message, variant: "destructive" as never });
      else if (data) { setItems(prev => [...prev, data]); toast({ title: "Added to queue!" }); }
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("recording_queue").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleStatusChange(item: QueueItem, status: QueueStatus) {
    const supabase = createClient();
    const { data } = await supabase.from("recording_queue").update({ status }).eq("id", item.id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === data.id ? data : i));
  }

  function toggleTone(tone: string) {
    setForm(f => ({
      ...f,
      tone_tags: f.tone_tags.includes(tone) ? f.tone_tags.filter(t => t !== tone) : [...f.tone_tags, tone],
    }));
  }

  const totalMin = Math.round(items.reduce((s, i) => s + (i.estimated_duration || 0), 0) / 60);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-foreground">{readyItems.length}</div>
            <div className="text-[10px] text-muted-foreground font-medium">To Film</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{recordedItems.length}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Recorded</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-xl font-bold text-primary">{totalMin}m</div>
            <div className="text-[10px] text-muted-foreground font-medium">Est. Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Retake alert */}
      {retakeItems.length > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{retakeItems.length} video{retakeItems.length > 1 ? "s" : ""} need a retake</p>
            <p className="text-xs text-orange-600/80 dark:text-orange-500/80">{retakeItems.map(i => i.title).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Motivational prompt */}
      {readyItems.length > 0 && (
        <Card className="gradient-primary border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="text-white">
              <p className="font-semibold text-sm">Ready to record?</p>
              <p className="text-xs opacity-80">Pick the first item and press record. One video at a time.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Queue ({items.length})</h2>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Queue list */}
      {items.length === 0 ? (
        <div className="text-center py-16 spring-in">
          <div className="w-16 h-16 gradient-cool rounded-2xl flex items-center justify-center mx-auto mb-4 glow-pulse">
            <Film className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-foreground mb-1">What will you record this week?</p>
          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto mt-1 leading-relaxed">
            Your audience is waiting. Queue your topics and build momentum one video at a time.
          </p>
          <Button onClick={openAdd} className="mt-5 tap-scale btn-ripple"><Plus className="h-4 w-4 mr-2" />Plan Your Week</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const statusCfg = STATUS_CONFIG[item.status];
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Priority order buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0}
                      className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={index === items.length - 1}
                      className="text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Priority number */}
                  <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground line-clamp-1">{item.title}</p>
                    {item.hook && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">Hook: {item.hook}</p>}

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(item, s)}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all",
                            item.status === s ? statusCfg.color : "bg-muted/60 text-muted-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {item.estimated_duration && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {Math.round(item.estimated_duration / 60)}min
                        </span>
                      )}
                      {item.tone_tags?.map(tag => (
                        <span key={tag} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-md font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {item.filming_notes && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5 line-clamp-2 italic">
                        Note: {item.filming_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add to Queue"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            {ideas.length > 0 && !editingItem && (
              <div className="space-y-2">
                <Label>Import from Ideas</Label>
                <Select value={form.idea_id} onValueChange={(v) => {
                  const idea = ideas.find(i => i.id === v);
                  if (idea) setForm(f => ({ ...f, idea_id: v, title: idea.title, hook: idea.hook || "", category: idea.category || "" }));
                  else setForm(f => ({ ...f, idea_id: "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Pick an existing idea..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— custom —</SelectItem>
                    {ideas.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What will you talk about?" />
            </div>
            <div className="space-y-2">
              <Label>Hook</Label>
              <Input value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} placeholder="Opening line..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as QueueStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Est. Duration (min)</Label>
                <Input type="number" min="1" max="60" placeholder="e.g. 3"
                  value={form.estimated_duration}
                  onChange={e => setForm(f => ({ ...f, estimated_duration: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Emotional Tone Tags</Label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map(tone => (
                  <button key={tone} type="button" onClick={() => toggleTone(tone)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-xl font-medium transition-all",
                      form.tone_tags.includes(tone)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}>
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Filming Notes</Label>
              <Textarea placeholder="Remember to mention..., set up the ring light, etc." value={form.filming_notes}
                onChange={e => setForm(f => ({ ...f, filming_notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingItem ? "Update" : "Add to Queue"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
