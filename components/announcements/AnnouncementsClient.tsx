"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Megaphone, Plus, Pin, Trophy, Bell, BookOpen, CalendarDays,
  Copy, Check, Trash2, Edit3, Share2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: "update" | "win" | "reminder" | "resource" | "event";
  pinned: boolean;
  platforms: string[];
  created_at: string;
}

interface Props {
  announcements: Announcement[];
  userId: string;
}

const TYPE_CONFIG = {
  update:   { label: "Update",   icon: Megaphone,   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  win:      { label: "Win",      icon: Trophy,      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  reminder: { label: "Reminder", icon: Bell,        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  resource: { label: "Resource", icon: BookOpen,    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  event:    { label: "Event",    icon: CalendarDays, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

const PLATFORMS = ["TikTok", "YouTube", "Instagram", "Facebook"];

const EMPTY_FORM = {
  title: "",
  content: "",
  type: "update" as Announcement["type"],
  pinned: false,
  platforms: [] as string[],
};

export function AnnouncementsClient({ announcements: initial, userId }: Props) {
  const [items, setItems] = useState<Announcement[]>(initial);
  const [filter, setFilter] = useState<Announcement["type"] | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = items
    .filter(a => filter === "all" || a.type === filter)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pinned = filtered.filter(a => a.pinned);
  const unpinned = filtered.filter(a => !a.pinned);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, content: a.content, type: a.type, pinned: a.pinned, platforms: a.platforms || [] });
    setDialogOpen(true);
  }

  function togglePlatform(p: string) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();

    if (editing) {
      const { data, error } = await supabase
        .from("announcements")
        .update({ title: form.title, content: form.content, type: form.type, pinned: form.pinned, platforms: form.platforms })
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setItems(prev => prev.map(i => i.id === data.id ? data : i));
        toast({ title: "Announcement updated" });
      }
    } else {
      const { data, error } = await supabase
        .from("announcements")
        .insert({ user_id: userId, title: form.title, content: form.content, type: form.type, pinned: form.pinned, platforms: form.platforms })
        .select()
        .single();
      if (!error && data) {
        setItems(prev => [data, ...prev]);
        toast({ title: "Announcement created!" });
      }
    }

    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("announcements").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Deleted" });
  }

  async function togglePin(a: Announcement) {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .update({ pinned: !a.pinned })
      .eq("id", a.id)
      .select()
      .single();
    if (data) setItems(prev => prev.map(i => i.id === data.id ? data : i));
  }

  function copyAsCaption(a: Announcement) {
    const text = `${a.title}\n\n${a.content}${a.platforms.length ? `\n\n${a.platforms.map(p => `#${p}`).join(" ")}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(a.id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(["all", "update", "win", "reminder", "resource", "event"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
              filter === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "all" ? "All" : TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* New button */}
      <Button onClick={openNew} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        New Announcement
      </Button>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center spring-in">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4 glow-pulse">
            <Megaphone className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Your community is listening.</h3>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mt-1">
            Share a win, a reminder, or a resource. Every post strengthens your connection with Somali families.
          </p>
        </div>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pin className="h-3 w-3 text-primary" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pinned</p>
          </div>
          {pinned.map(a => <AnnouncementCard key={a.id} a={a} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} onCopy={copyAsCaption} copied={copied} />)}
        </div>
      )}

      {/* All / filtered */}
      {unpinned.length > 0 && (
        <div className="space-y-2">
          {pinned.length > 0 && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
          )}
          {unpinned.map(a => <AnnouncementCard key={a.id} a={a} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} onCopy={copyAsCaption} copied={copied} />)}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Announcement["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement headline..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your announcement, update, or message..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Share to Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200",
                      form.platforms.includes(p)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="text-sm font-medium">Pin this announcement</p>
                <p className="text-xs text-muted-foreground">Appears at the top of the list</p>
              </div>
              <Switch checked={form.pinned} onCheckedChange={v => setForm(f => ({ ...f, pinned: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementCard({
  a, onEdit, onDelete, onPin, onCopy, copied,
}: {
  a: Announcement;
  onEdit: (a: Announcement) => void;
  onDelete: (id: string) => void;
  onPin: (a: Announcement) => void;
  onCopy: (a: Announcement) => void;
  copied: string | null;
}) {
  const { icon: Icon, color, label } = TYPE_CONFIG[a.type];
  const isCopied = copied === a.id;

  return (
    <Card className={cn("card-hover", a.pinned && "border-primary/30 shadow-sm")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", color)}>{label}</span>
                {a.pinned && (
                  <span className="text-[10px] font-semibold text-primary flex items-center gap-0.5">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(a.created_at), "MMM d")}
              </span>
            </div>

            <h3 className="font-semibold text-sm text-foreground mb-1 leading-tight">{a.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{a.content}</p>

            {a.platforms && a.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {a.platforms.map(p => (
                  <span key={p} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {p}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 mt-3">
              <button
                onClick={() => onCopy(a)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-all"
              >
                {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {isCopied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => onPin(a)}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg transition-all",
                  a.pinned
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Pin className="h-3 w-3" />
                {a.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => onEdit(a)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-all"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => onDelete(a.id)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition-all ml-auto"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
