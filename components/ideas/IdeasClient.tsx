"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContentIdea, Platform, ContentCategory, ContentStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Lightbulb, Download, Check } from "lucide-react";
import { getStatusColor, getPlatformColor, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];
const CATEGORIES: ContentCategory[] = [
  "Parenting Tips", "Communication", "Child Development", "Family Peace",
  "Islamic Parenting", "Teen Parenting", "Early Childhood", "Motivation", "Q&A", "Story"
];
const STATUSES: ContentStatus[] = ["Idea", "Recorded", "Edited", "Posted"];

interface Props {
  ideas: ContentIdea[];
  userId: string;
}

const emptyForm = {
  title: "",
  hook: "",
  platform: "TikTok" as Platform,
  category: "Parenting Tips" as ContentCategory,
  status: "Idea" as ContentStatus,
  notes: "",
};

export function IdeasClient({ ideas: initial, userId }: Props) {
  const [ideas, setIdeas] = useState(initial);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [exported, setExported] = useState(false);
  const router = useRouter();

  function handleExport() {
    const toExport = filtered.length > 0 ? filtered : ideas;
    const lines = toExport.map(idea =>
      `[${idea.status}] [${idea.platform}] ${idea.title}${idea.hook ? `\nHook: ${idea.hook}` : ""}${idea.notes ? `\nNotes: ${idea.notes}` : ""}`
    );
    const text = `Guri Dagan — Content Ideas Export\n${new Date().toLocaleDateString()}\n\n${lines.join("\n\n")}`;
    navigator.clipboard.writeText(text);
    setExported(true);
    toast({ title: `${toExport.length} ideas copied to clipboard!` });
    setTimeout(() => setExported(false), 2000);
  }

  const filtered = ideas.filter((idea) => {
    const matchSearch = !search || idea.title.toLowerCase().includes(search.toLowerCase()) || idea.hook.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || idea.status === filterStatus;
    const matchPlatform = filterPlatform === "all" || idea.platform === filterPlatform;
    return matchSearch && matchStatus && matchPlatform;
  });

  function openAdd() {
    setEditingIdea(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(idea: ContentIdea) {
    setEditingIdea(idea);
    setForm({
      title: idea.title,
      hook: idea.hook,
      platform: idea.platform,
      category: idea.category,
      status: idea.status,
      notes: idea.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.hook.trim()) {
      toast({ title: "Please fill in title and hook", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();

    if (editingIdea) {
      const { data, error } = await supabase
        .from("content_ideas")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editingIdea.id)
        .select()
        .single();
      if (error) {
        toast({ title: "Could not save — please try again", variant: "destructive" as never });
        setSaving(false);
        return;
      }
      if (data) {
        setIdeas(prev => prev.map(i => i.id === data.id ? data : i));
        toast({ title: "Idea updated!" });
      }
    } else {
      const { data, error } = await supabase
        .from("content_ideas")
        .insert({ ...form, user_id: userId })
        .select()
        .single();
      if (error) {
        toast({ title: "Could not save — please try again", variant: "destructive" as never });
        setSaving(false);
        return;
      }
      if (data) {
        setIdeas(prev => [data, ...prev]);
        toast({ title: "Idea saved!" });
      }
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("content_ideas").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete — please try again", variant: "destructive" as never });
      return;
    }
    setIdeas(prev => prev.filter(i => i.id !== id));
    toast({ title: "Idea deleted" });
  }

  async function handleStatusChange(idea: ContentIdea, status: ContentStatus) {
    // Optimistic update first
    setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status } : i));
    const supabase = createClient();
    const { error } = await supabase
      .from("content_ideas")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", idea.id);
    if (error) {
      // Roll back
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: idea.status } : i));
      toast({ title: "Status not saved — connection issue", variant: "destructive" as never });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openAdd} size="icon" className="shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleExport}
            size="icon"
            variant="outline"
            className="shrink-0"
            title="Copy all ideas to clipboard"
          >
            {exported ? <Check className="h-4 w-4 text-green-500" /> : <Download className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["all", ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["all", ...PLATFORMS].map(p => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterPlatform === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">{filtered.length} ideas</p>

      {/* Ideas List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 spring-in">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 glow-pulse">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-foreground mb-1">Your next idea could help a struggling parent today.</p>
          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto mt-1 leading-relaxed">
            One idea, captured now, becomes a video that reaches a family that needs it.
          </p>
          <Button onClick={openAdd} className="mt-5 tap-scale btn-ripple">
            <Plus className="h-4 w-4 mr-2" />
            Capture an Idea
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((idea) => (
            <Card key={idea.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
                      {idea.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      Hook: {idea.hook}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getPlatformColor(idea.platform)}`}>
                        {idea.platform}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                        {idea.category}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(idea, s)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all ${
                            idea.status === s
                              ? getStatusColor(s) + " ring-1 ring-current/30"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">{formatDate(idea.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(idea)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(idea.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIdea ? "Edit Idea" : "New Content Idea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. 5 ways to talk to your teenager"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Hook *</Label>
              <Textarea
                placeholder="The opening line that grabs attention..."
                value={form.hook}
                onChange={(e) => setForm(f => ({ ...f, hook: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v as Platform }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as ContentStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as ContentCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingIdea ? "Update" : "Save Idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
