"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Star, Copy, CheckCheck, Pencil, Trash2, MessageSquareQuote, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { formatDate, cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  user_id: string;
  client_name: string;
  content: string;
  type: "text" | "audio" | "video";
  media_url: string | null;
  topic_tags: string[] | null;
  featured: boolean;
  platform: string | null;
  created_at: string;
}

interface Props {
  testimonials: Testimonial[];
  userId: string;
}

const TOPICS = ["Communication", "Discipline", "Teen Parenting", "Family Peace", "Islamic Parenting", "Emotional Support", "Marriage", "Screen Time", "Other"];
const TYPES = ["text", "audio", "video"] as const;

const emptyForm = { client_name: "", content: "", type: "text" as "text" | "audio" | "video", media_url: "", topic_tags: [] as string[], featured: false, platform: "" };

export function TestimonialsClient({ testimonials: initial, userId }: Props) {
  const [testimonials, setTestimonials] = useState(initial);
  const [filter, setFilter] = useState<"all" | "featured">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = filter === "featured" ? testimonials.filter(t => t.featured) : testimonials;
  const featuredCount = testimonials.filter(t => t.featured).length;

  function openAdd() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(t: Testimonial) {
    setEditing(t);
    setForm({ client_name: t.client_name, content: t.content, type: t.type, media_url: t.media_url || "", topic_tags: t.topic_tags || [], featured: t.featured, platform: t.platform || "" });
    setDialogOpen(true);
  }

  function toggleTopic(tag: string) {
    setForm(f => ({ ...f, topic_tags: f.topic_tags.includes(tag) ? f.topic_tags.filter(t => t !== tag) : [...f.topic_tags, tag] }));
  }

  async function handleSave() {
    if (!form.client_name.trim() || !form.content.trim()) {
      toast({ title: "Name and testimonial are required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = { ...form, media_url: form.media_url || null, topic_tags: form.topic_tags.length ? form.topic_tags : null, platform: form.platform || null };

    if (editing) {
      const { data, error } = await supabase.from("testimonials").update(payload).eq("id", editing.id).select().single();
      if (!error && data) { setTestimonials(p => p.map(t => t.id === data.id ? data : t)); toast({ title: "Updated!" }); }
    } else {
      const { data, error } = await supabase.from("testimonials").insert({ ...payload, user_id: userId }).select().single();
      if (!error && data) { setTestimonials(p => [data, ...p]); toast({ title: "Testimonial saved!" }); }
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("testimonials").delete().eq("id", id);
    setTestimonials(p => p.filter(t => t.id !== id));
  }

  async function toggleFeatured(t: Testimonial) {
    const supabase = createClient();
    const { data } = await supabase.from("testimonials").update({ featured: !t.featured }).eq("id", t.id).select().single();
    if (data) setTestimonials(p => p.map(i => i.id === data.id ? data : i));
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied for social proof!" });
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center"><CardContent className="p-3"><div className="text-xl font-bold">{testimonials.length}</div><div className="text-[10px] text-muted-foreground">Total</div></CardContent></Card>
        <Card className="text-center"><CardContent className="p-3"><div className="text-xl font-bold text-yellow-500">{featuredCount}</div><div className="text-[10px] text-muted-foreground">Featured</div></CardContent></Card>
        <Card className="text-center"><CardContent className="p-3"><div className="text-xl font-bold text-blue-500">{testimonials.filter(t => t.type === "video").length}</div><div className="text-[10px] text-muted-foreground">Video</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "featured"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize", filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {f === "all" ? `All (${testimonials.length})` : `Featured (${featuredCount})`}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquareQuote className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No testimonials yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Add feedback from the parents you help</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-2" />Add Testimonial</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className={cn("card-hover", t.featured && "ring-2 ring-yellow-400/50")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-xs">{t.client_name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.client_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize", t.type === "video" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : t.type === "audio" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground")}>{t.type}</span>
                        {t.featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => toggleFeatured(t)} className={t.featured ? "text-yellow-500" : "text-muted-foreground"}>
                      <Star className={cn("h-3.5 w-3.5", t.featured && "fill-yellow-500")} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => copy(`"${t.content}" — ${t.client_name}`, t.id)}>
                      {copied === t.id ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(t.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <p className="text-sm text-foreground leading-relaxed italic mb-2">&ldquo;{t.content}&rdquo;</p>

                {t.topic_tags && t.topic_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.topic_tags.map(tag => <span key={tag} className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded-lg font-medium">{tag}</span>)}
                  </div>
                )}
                {t.media_url && (
                  <a href={t.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                    <ExternalLink className="h-3 w-3" />View {t.type}
                  </a>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatDate(t.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-2"><Label>Parent Name *</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="e.g. Hodan M." /></div>
            <div className="space-y-2"><Label>Testimonial *</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="What they said about your coaching..." rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "text" | "audio" | "video" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Platform</Label><Input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="TikTok, WhatsApp..." /></div>
            </div>
            {form.type !== "text" && <div className="space-y-2"><Label>Media URL</Label><Input value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} placeholder="https://..." /></div>}
            <div className="space-y-2">
              <Label>Topics</Label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTopic(tag)} className={cn("text-xs px-2.5 py-1 rounded-xl font-medium transition-all", form.topic_tags.includes(tag) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{tag}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
              <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
              <Label htmlFor="featured" className="cursor-pointer">Mark as Featured <span className="text-muted-foreground font-normal">(shown prominently)</span></Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
