"use client";

import { useState } from "react";
import { CalendarItem, ContentIdea, ContentStatus, Platform } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Youtube, Video, Shield } from "lucide-react";
import { getStatusColor, getPlatformColor, isToday } from "@/lib/utils";
import { parseScriptNotes, getProgramBadgeClass } from "@/lib/programs";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { format, startOfWeek, addDays, addWeeks, isSameDay } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUSES: ContentStatus[] = ["Idea", "Recorded", "Edited", "Posted"];
const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];

interface BatchCalendarPost {
  id: string;
  scheduled_date: string;
  platform: string;
  title: string;
  status: string;
  angle_notes?: string | null;
}

interface Props {
  items: CalendarItem[];
  ideas: Pick<ContentIdea, "id" | "title" | "platform" | "status">[];
  userId: string;
  batchPosts: BatchCalendarPost[];
}

export function CalendarClient({ items: initial, ideas, userId, batchPosts }: Props) {
  const [items, setItems] = useState(initial);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    title: "",
    platform: "TikTok" as Platform,
    status: "Idea" as ContentStatus,
    idea_id: "",
  });
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekItems = items.filter((item) => {
    const d = new Date(item.scheduled_date);
    return weekDates.some(wd => isSameDay(wd, d));
  });

  function getItemsForDate(date: Date): CalendarItem[] {
    return weekItems.filter(item => isSameDay(new Date(item.scheduled_date), date));
  }

  function getBatchPostsForDate(date: Date): BatchCalendarPost[] {
    const dateStr = format(date, "yyyy-MM-dd");
    return batchPosts.filter(p => p.scheduled_date === dateStr);
  }

  function openAdd(date: Date) {
    setSelectedDate(date);
    setForm({ title: "", platform: "TikTok", status: "Idea", idea_id: "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() && !form.idea_id) {
      toast({ title: "Add a title or pick an idea", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const selectedIdea = form.idea_id ? ideas.find(i => i.id === form.idea_id) : null;

    const { data, error } = await supabase
      .from("calendar_items")
      .insert({
        user_id: userId,
        title: selectedIdea ? selectedIdea.title : form.title,
        platform: selectedIdea ? selectedIdea.platform : form.platform,
        status: form.status,
        idea_id: form.idea_id || null,
        scheduled_date: selectedDate!.toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: error.message, variant: "destructive" as never });
    } else if (data) {
      setItems(prev => [...prev, data]);
      toast({ title: "Added to calendar!" });
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleStatusChange(item: CalendarItem, status: ContentStatus) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("calendar_items")
      .update({ status })
      .eq("id", item.id)
      .select()
      .single();
    if (!error && data) {
      setItems(prev => prev.map(i => i.id === data.id ? data : i));
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("calendar_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const totalThisWeek = weekItems.length;
  const postedThisWeek = weekItems.filter(i => i.status === "Posted").length;

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
          {weekOffset === 0 && <p className="text-xs text-primary font-medium">This Week</p>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Summary */}
      <Card className="bg-muted/30 border-0">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{totalThisWeek} planned this week</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{postedThisWeek} posted</span>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Grid */}
      <div className="space-y-3">
        {weekDates.map((date, idx) => {
          const dayItems = getItemsForDate(date);
          const dayBatchPosts = getBatchPostsForDate(date);
          const todayMark = isToday(date);

          return (
            <div
              key={idx}
              className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                todayMark ? "border-primary/50 shadow-sm" : "border-border"
              }`}
            >
              {/* Day Header */}
              <div className={`flex items-center justify-between px-4 py-2.5 ${todayMark ? "bg-primary/5" : "bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${todayMark ? "text-primary" : "text-foreground"}`}>
                    {DAYS[idx]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${
                    todayMark ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                  }`}>
                    {format(date, "d")}
                  </span>
                  {todayMark && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Today</span>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openAdd(date)}
                  className="h-7 w-7 rounded-lg"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Batch posts — read-only, from weekly batch system */}
              {dayBatchPosts.length > 0 && (
                <div className="px-3 pt-2 space-y-1.5">
                  {dayBatchPosts.map(post => {
                    const script = parseScriptNotes(post.angle_notes);
                    return (
                      <div
                        key={post.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/15"
                      >
                        {post.platform === "youtube"
                          ? <Youtube className="h-3 w-3 text-red-500 shrink-0" />
                          : <Video className="h-3 w-3 text-slate-500 shrink-0" />
                        }
                        <p className="text-[11px] font-medium text-foreground leading-snug flex-1 min-w-0 truncate">{post.title}</p>
                        {script.program && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getProgramBadgeClass(script.program)}`}>
                            <Shield className="h-2 w-2 inline mr-0.5 -mt-0.5" />
                            {script.program.replace("™", "")}
                          </span>
                        )}
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                          post.status === "posted" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-primary/10 text-primary"
                        }`}>
                          {post.status === "posted" ? "Posted" : "Batch"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Day Body */}
              <div className={`bg-background min-h-[48px] ${dayItems.length === 0 ? "py-2" : "pb-2"}`}>
                {dayItems.length === 0 ? (
                  <div className="px-4 py-1">
                    <p className="text-xs text-muted-foreground/50">No content planned</p>
                  </div>
                ) : (
                  dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="mx-3 my-1.5 p-3 rounded-xl bg-muted/40 flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{item.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${getPlatformColor(item.platform)}`}>
                            {item.platform}
                          </span>
                          {STATUSES.map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(item, s)}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-all ${
                                item.status === s ? getStatusColor(s) : "bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground/50 hover:text-destructive text-xs shrink-0 mt-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add to {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Calendar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {ideas.length > 0 && (
              <div className="space-y-2">
                <Label>Pick from your ideas</Label>
                <Select value={form.idea_id} onValueChange={(v) => setForm(f => ({ ...f, idea_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing idea..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No idea (custom)</SelectItem>
                    {ideas.map(idea => (
                      <SelectItem key={idea.id} value={idea.id}>
                        {idea.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!form.idea_id && (
              <>
                <div className="space-y-2">
                  <Label>Custom Title</Label>
                  <Input
                    placeholder="Content title..."
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v as Platform }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
