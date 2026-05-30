"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { CalendarItem, ContentIdea, ContentStatus, Platform } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, GripVertical } from "lucide-react";
import { getStatusColor, getPlatformColor, isToday } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUSES: ContentStatus[] = ["Idea", "Recorded", "Edited", "Posted"];
const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];

interface Props {
  items: CalendarItem[];
  ideas: Pick<ContentIdea, "id" | "title" | "platform" | "status">[];
  userId: string;
}

export function CalendarClient({ items: initial, ideas, userId }: Props) {
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

    if (!error && data) {
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

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const sourceDateStr = result.source.droppableId;
    const destDateStr = result.destination.droppableId;

    if (sourceDateStr === destDateStr) return; // same day — no-op

    const draggedId = result.draggableId;
    const draggedItem = items.find(i => i.id === draggedId);
    if (!draggedItem) return;

    const newDate = new Date(destDateStr);
    newDate.setHours(12, 0, 0, 0); // noon to avoid TZ edge cases

    // Optimistic update
    setItems(prev =>
      prev.map(i => i.id === draggedId ? { ...i, scheduled_date: newDate.toISOString() } : i)
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("calendar_items")
      .update({ scheduled_date: newDate.toISOString() })
      .eq("id", draggedId);

    if (error) {
      // Rollback
      setItems(prev =>
        prev.map(i => i.id === draggedId ? draggedItem : i)
      );
      toast({ title: "Could not move item", variant: "destructive" as never });
    } else {
      toast({ title: `Moved to ${format(newDate, "EEE, MMM d")}` });
    }
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
          {totalThisWeek > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">Drag items between days to reschedule</p>
          )}
        </CardContent>
      </Card>

      {/* Weekly Grid with Drag-and-Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {weekDates.map((date, idx) => {
            const dayItems = getItemsForDate(date);
            const todayMark = isToday(date);
            const droppableId = date.toISOString().split("T")[0];

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

                {/* Droppable Day Body */}
                <Droppable droppableId={droppableId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-background min-h-[48px] transition-colors duration-200 ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      } ${dayItems.length === 0 ? "py-2" : "pb-2"}`}
                    >
                      {dayItems.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="px-4 py-1">
                          <p className="text-xs text-muted-foreground/50">No content planned</p>
                        </div>
                      ) : (
                        dayItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`mx-3 my-1.5 p-3 rounded-xl bg-muted/40 flex items-start gap-2 transition-shadow duration-200 ${
                                  dragSnapshot.isDragging ? "shadow-lg ring-1 ring-primary/30 bg-background" : ""
                                }`}
                              >
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </div>
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
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

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
