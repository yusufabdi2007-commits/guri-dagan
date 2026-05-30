"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, ChevronRight, CheckCircle2, Calendar, AlertCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { formatDate, cn } from "@/lib/utils";

type ClientStatus = "Active" | "Paused" | "Completed" | "Prospective";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  concerns: string | null;
  status: ClientStatus;
  progress_rating: number | null;
  created_at: string;
}

interface Task {
  id: string;
  client_id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  priority: "Low" | "Normal" | "High";
}

interface Props {
  clients: Client[];
  pendingTasks: Task[];
  userId: string;
}

const STATUS_COLORS: Record<ClientStatus, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Prospective: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_DOT: Record<ClientStatus, string> = {
  Active: "bg-green-500", Paused: "bg-yellow-500", Completed: "bg-blue-500", Prospective: "bg-purple-500"
};

const emptyForm = { name: "", email: "", phone: "", notes: "", concerns: "", status: "Active" as ClientStatus, progress_rating: "" };

export function CrmClient({ clients: initial, pendingTasks, userId }: Props) {
  const [clients, setClients] = useState(initial);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = clients.filter(c => c.status === "Active").length;

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" as never }); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = { name: form.name, email: form.email || null, phone: form.phone || null, notes: form.notes || null, concerns: form.concerns || null, status: form.status, progress_rating: form.progress_rating ? parseInt(form.progress_rating) : null };
    const { data, error } = await supabase.from("crm_clients").insert({ ...payload, user_id: userId }).select().single();
    if (!error && data) { setClients(p => [data, ...p]); toast({ title: "Client added!" }); }
    setSaving(false);
    setDialogOpen(false);
  }

  async function completeTask(taskId: string) {
    const supabase = createClient();
    await supabase.from("crm_tasks").update({ completed: true }).eq("id", taskId);
    toast({ title: "Task completed!" });
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center"><CardContent className="p-3"><div className="text-xl font-bold text-green-600 dark:text-green-400">{activeCount}</div><div className="text-[10px] text-muted-foreground">Active</div></CardContent></Card>
        <Card className="text-center"><CardContent className="p-3"><div className="text-xl font-bold">{clients.length}</div><div className="text-[10px] text-muted-foreground">Total</div></CardContent></Card>
        <Card className="text-center"><CardContent className="p-3"><div className="text-xl font-bold text-orange-500">{pendingTasks.length}</div><div className="text-[10px] text-muted-foreground">Tasks</div></CardContent></Card>
      </div>

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-foreground">Pending Follow-ups</p>
            </div>
            <div className="space-y-2">
              {pendingTasks.slice(0, 4).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 bg-background rounded-xl">
                  <button onClick={() => completeTask(task.id)} className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                    {task.due_date && <p className="text-[10px] text-muted-foreground">{formatDate(task.due_date)}</p>}
                  </div>
                  {task.priority === "High" && <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium">High</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button size="icon" onClick={() => { setForm(emptyForm); setDialogOpen(true); }} className="shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {["all", "Active", "Paused", "Completed", "Prospective"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all", filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No clients yet</p>
          <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} className="mt-4"><Plus className="h-4 w-4 mr-2" />Add Client</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => (
            <Link key={client.id} href={`/crm/${client.id}`}>
              <Card className="card-hover cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center">
                        <span className="text-white font-bold">{client.name[0]?.toUpperCase()}</span>
                      </div>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", STATUS_DOT[client.status])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{client.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-lg", STATUS_COLORS[client.status])}>{client.status}</span>
                        {client.progress_rating && (
                          <span className="text-[10px] text-muted-foreground">Progress: {client.progress_rating}/10</span>
                        )}
                      </div>
                      {client.concerns && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{client.concerns}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Parent's name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1..." /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ClientStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Active", "Paused", "Completed", "Prospective"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." /></div>
            <div className="space-y-2"><Label>Main Concerns / Challenges</Label><Textarea value={form.concerns} onChange={e => setForm(f => ({ ...f, concerns: e.target.value }))} placeholder="What are they struggling with?" rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context..." rows={2} /></div>
            <div className="space-y-2"><Label>Progress Rating (1–10)</Label><Input type="number" min="1" max="10" value={form.progress_rating} onChange={e => setForm(f => ({ ...f, progress_rating: e.target.value }))} placeholder="e.g. 7" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
