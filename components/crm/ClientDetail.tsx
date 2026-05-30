"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Circle, Calendar, MessageSquare, ChevronLeft, Trash2, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";

interface Client { id: string; name: string; email: string | null; phone: string | null; notes: string | null; concerns: string | null; status: string; progress_rating: number | null; }
interface Session { id: string; session_date: string; notes: string | null; mood_rating: number | null; topics_covered: string[] | null; next_steps: string | null; }
interface Task { id: string; title: string; due_date: string | null; completed: boolean; priority: string; }

interface Props { client: Client; sessions: Session[]; tasks: Task[]; userId: string; }

export function ClientDetail({ client, sessions: initialSessions, tasks: initialTasks, userId }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [tasks, setTasks] = useState(initialTasks);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [sessionForm, setSessionForm] = useState({ session_date: new Date().toISOString().split("T")[0], notes: "", mood_rating: "3", next_steps: "" });
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "Normal" });
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function deleteClient() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("crm_clients").delete().eq("id", client.id);
    if (!error) {
      toast({ title: `${client.name} deleted` });
      router.push("/crm");
    } else {
      toast({ title: "Delete failed", variant: "destructive" as never });
      setDeleting(false);
    }
  }

  async function addSession() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("crm_sessions").insert({ client_id: client.id, user_id: userId, session_date: sessionForm.session_date, notes: sessionForm.notes || null, mood_rating: parseInt(sessionForm.mood_rating), next_steps: sessionForm.next_steps || null }).select().single();
    if (!error && data) { setSessions(p => [data, ...p]); toast({ title: "Session logged!" }); }
    setSaving(false);
    setSessionDialog(false);
  }

  async function addTask() {
    if (!taskForm.title.trim()) { toast({ title: "Task title required", variant: "destructive" as never }); return; }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("crm_tasks").insert({ client_id: client.id, user_id: userId, title: taskForm.title, due_date: taskForm.due_date || null, priority: taskForm.priority, completed: false }).select().single();
    if (!error && data) { setTasks(p => [...p, data]); toast({ title: "Task added!" }); }
    setSaving(false);
    setTaskDialog(false);
  }

  async function toggleTask(task: Task) {
    const supabase = createClient();
    const { data } = await supabase.from("crm_tasks").update({ completed: !task.completed }).eq("id", task.id).select().single();
    if (data) setTasks(p => p.map(t => t.id === data.id ? data : t));
  }

  const moodEmoji = (r: number | null) => r ? ["😞", "😕", "😐", "🙂", "😊"][r - 1] : "—";
  const pendingTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link href="/crm" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Back to CRM
        </Link>
        <button
          onClick={() => setDeleteDialog(true)}
          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete client"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Client card */}
      <Card className="gradient-primary border-0 shadow-lg">
        <CardContent className="p-5 text-white">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-2xl font-black">{client.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{client.name}</h2>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg font-medium">{client.status}</span>
              {client.progress_rating && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                    <span>Progress</span><span className="font-bold">{client.progress_rating}/10</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div className="h-1.5 bg-white rounded-full" style={{ width: `${client.progress_rating * 10}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-xl hover:bg-white/30 transition-colors"><Phone className="h-3 w-3" />{client.phone}</a>}
            {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-xl hover:bg-white/30 transition-colors"><Mail className="h-3 w-3" />{client.email}</a>}
          </div>
        </CardContent>
      </Card>

      {/* Concerns / Notes */}
      {(client.concerns || client.notes) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {client.concerns && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Main Concerns</p><p className="text-sm text-foreground">{client.concerns}</p></div>}
            {client.notes && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-foreground">{client.notes}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Follow-up Tasks ({pendingTasks.length} pending)</CardTitle>
            <Button size="icon-sm" variant="ghost" onClick={() => { setTaskForm({ title: "", due_date: "", priority: "Normal" }); setTaskDialog(true); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? <p className="text-xs text-muted-foreground">No tasks yet</p> : (
            [...pendingTasks, ...doneTasks].map(task => (
              <div key={task.id} className={cn("flex items-center gap-3 p-2.5 rounded-xl transition-all", task.completed ? "opacity-50" : "bg-muted/30")}>
                <button onClick={() => toggleTask(task)} className={cn("shrink-0 transition-colors", task.completed ? "text-green-500" : "text-muted-foreground hover:text-primary")}>
                  {task.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                  {task.due_date && <p className="text-[10px] text-muted-foreground">{formatDate(task.due_date)}</p>}
                </div>
                {task.priority === "High" && !task.completed && <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium shrink-0">High</span>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Sessions ({sessions.length})</CardTitle>
            <Button size="icon-sm" variant="ghost" onClick={() => { setSessionForm({ session_date: new Date().toISOString().split("T")[0], notes: "", mood_rating: "3", next_steps: "" }); setSessionDialog(true); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? <p className="text-xs text-muted-foreground">No sessions logged yet</p> : (
            sessions.map(s => (
              <div key={s.id} className="p-3 bg-muted/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{formatDate(s.session_date)}</span>
                  <span className="text-base">{moodEmoji(s.mood_rating)}</span>
                </div>
                {s.notes && <p className="text-xs text-foreground leading-relaxed">{s.notes}</p>}
                {s.next_steps && <p className="text-xs text-muted-foreground italic">Next: {s.next_steps}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Session Dialog */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={sessionForm.session_date} onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Client Mood</Label>
              <Select value={sessionForm.mood_rating} onValueChange={v => setSessionForm(f => ({ ...f, mood_rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["1","😞 Struggling"],["2","😕 Low"],["3","😐 Neutral"],["4","🙂 Good"],["5","😊 Great"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Session Notes</Label><Textarea value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} placeholder="What was discussed..." rows={3} /></div>
            <div className="space-y-2"><Label>Next Steps</Label><Input value={sessionForm.next_steps} onChange={e => setSessionForm(f => ({ ...f, next_steps: e.target.value }))} placeholder="What they should do before next session..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialog(false)}>Cancel</Button>
            <Button onClick={addSession} disabled={saving}>{saving ? "Saving..." : "Log Session"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {client.name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the client and all their sessions and tasks. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteClient} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Follow-up Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Task *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Send parenting article, Check in after family meeting..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low","Normal","High"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={saving}>{saving ? "Saving..." : "Add Task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
