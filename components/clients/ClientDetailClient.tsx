"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Calendar, PoundSterling, MessageSquareQuote,
  Save, Trash2, Plus, UserCheck, CheckCircle2, Phone, Mail,
  ChevronRight, Edit2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PROGRAMS, getProgramBadgeClass } from "@/lib/programs";

const PROGRAM_OPTIONS = Object.keys(PROGRAMS) as (keyof typeof PROGRAMS)[];

const STATUS_CONFIG = {
  active: { label: "Active", color: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
  completed: { label: "Completed", color: "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400" },
  paused: { label: "Paused", color: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  cancelled: { label: "Cancelled", color: "border-zinc-400 bg-zinc-50 text-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-400" },
};

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_status: string;
  notes: string | null;
}

interface TestimonialRequest {
  id: string;
  status: string;
  requested_at: string;
  received_at: string | null;
}

interface Enrollment {
  id: string;
  lead_id: string | null;
  parent_name: string;
  child_name: string | null;
  program: string | null;
  enrollment_date: string;
  status: "active" | "completed" | "paused" | "cancelled";
  notes: string | null;
  leads: { id: string; name: string; phone: string | null; email: string | null; source: string; program: string | null; stage: string; notes: string | null } | null;
  payments: Payment[];
  testimonial_requests: TestimonialRequest[];
}

export function ClientDetailClient({ enrollment: initial }: { enrollment: Enrollment }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState(initial);
  const [payments, setPayments] = useState(initial.payments);
  const [testimonials, setTestimonials] = useState(initial.testimonial_requests);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [requestingTestimonial, setRequestingTestimonial] = useState(false);

  const [parentName, setParentName] = useState(enrollment.parent_name);
  const [childName, setChildName] = useState(enrollment.child_name || "");
  const [program, setProgram] = useState(enrollment.program || "");
  const [status, setStatus] = useState<typeof enrollment.status>(enrollment.status);
  const [notes, setNotes] = useState(enrollment.notes || "");
  const [enrollmentDate, setEnrollmentDate] = useState(enrollment.enrollment_date);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");

  const isDirty = parentName !== enrollment.parent_name || childName !== (enrollment.child_name || "")
    || program !== (enrollment.program || "") || status !== enrollment.status
    || notes !== (enrollment.notes || "") || enrollmentDate !== enrollment.enrollment_date;

  const totalRevenue = payments.filter(p => p.payment_status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.payment_status === "pending").reduce((sum, p) => sum + p.amount, 0);

  async function handleSave() {
    if (!parentName.trim()) {
      toast({ title: "Name is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_name: parentName,
          child_name: childName || null,
          program: program || null,
          status,
          notes: notes || null,
          enrollment_date: enrollmentDate,
        }),
      });
      if (!res.ok) throw new Error();
      const { enrollment: updated } = await res.json();
      setEnrollment(e => ({ ...e, ...updated }));
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Could not save", variant: "destructive" as never });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete client "${enrollment.parent_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/enrollments/${enrollment.id}`, { method: "DELETE" });
      router.push("/clients");
      toast({ title: "Client deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" as never });
      setDeleting(false);
    }
  }

  async function handleAddPayment() {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast({ title: "Enter a valid amount", variant: "destructive" as never });
      return;
    }
    setAddingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollment_id: enrollment.id,
          amount: parseFloat(paymentAmount),
          currency: "GBP",
          payment_date: paymentDate,
          payment_status: paymentStatus,
          notes: paymentNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { payment } = await res.json();
      setPayments(prev => [payment, ...prev]);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentStatus("paid");
      setShowPaymentForm(false);
      toast({ title: "Payment recorded" });
    } catch {
      toast({ title: "Could not record payment", variant: "destructive" as never });
    } finally {
      setAddingPayment(false);
    }
  }

  async function handleRequestTestimonial() {
    setRequestingTestimonial(true);
    try {
      const res = await fetch("/api/testimonial-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment_id: enrollment.id }),
      });
      if (!res.ok) throw new Error();
      const { request } = await res.json();
      setTestimonials(prev => [request, ...prev]);
      toast({ title: "Testimonial request logged" });
    } catch {
      toast({ title: "Could not log request", variant: "destructive" as never });
    } finally {
      setRequestingTestimonial(false);
    }
  }

  async function handleMarkTestimonialReceived(requestId: string) {
    try {
      const res = await fetch("/api/testimonial-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status: "received" }),
      });
      if (!res.ok) throw new Error();
      setTestimonials(prev => prev.map(t => t.id === requestId ? { ...t, status: "received", received_at: new Date().toISOString() } : t));
      toast({ title: "Testimonial marked as received" });
    } catch {
      toast({ title: "Could not update", variant: "destructive" as never });
    }
  }

  const currentStatusCfg = STATUS_CONFIG[status];
  const hasRequestedTestimonial = testimonials.some(t => t.status === "pending");
  const hasReceivedTestimonial = testimonials.some(t => t.status === "received");

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Back to Clients
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">{enrollment.parent_name[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">{enrollment.parent_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border", currentStatusCfg.color)}>
              <UserCheck className="h-3 w-3" />{currentStatusCfg.label}
            </span>
            {enrollment.program && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1", getProgramBadgeClass(enrollment.program))}>
                <Shield className="h-2 w-2" />{enrollment.program}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 text-center">
          <PoundSterling className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">£{totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Total Paid</div>
        </div>
        <div className={cn("border rounded-2xl p-3 text-center", pendingAmount > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30 border-border")}>
          <Calendar className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className={cn("text-xl font-bold", pendingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {pendingAmount > 0 ? `£${pendingAmount.toLocaleString()}` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">Pending</div>
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Info</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Parent Name *</Label>
                <Input value={parentName} onChange={e => setParentName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Child Name</Label>
                <Input value={childName} onChange={e => setChildName(e.target.value)} placeholder="Child's name..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Shield className="h-3 w-3 text-primary" />Program</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown</SelectItem>
                  {PROGRAM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Enrolled</Label>
                <Input type="date" value={enrollmentDate} onChange={e => setEnrollmentDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Progress, goals, session notes..." rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isDirty && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      )}

      {/* Lead link */}
      {enrollment.leads && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lead Profile</p>
            <Link href={`/leads/${enrollment.lead_id}`} className="flex items-center gap-3 hover:bg-muted/50 -mx-2 px-2 py-2 rounded-xl transition-colors">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{enrollment.leads.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{enrollment.leads.name}</p>
                {enrollment.leads.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />{enrollment.leads.phone}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payments</p>
            <Button variant="ghost" size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" />Add
            </Button>
          </div>

          {showPaymentForm && (
            <div className="space-y-3 border border-border rounded-xl p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (£) *</Label>
                  <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional note..." />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddPayment} disabled={addingPayment} className="flex-1">
                  {addingPayment ? "Recording..." : "Record Payment"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-foreground">£{p.amount.toLocaleString()}</span>
                    {p.notes && <span className="text-muted-foreground text-xs ml-2">{p.notes}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border",
                      p.payment_status === "paid" ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" :
                      p.payment_status === "pending" ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400" :
                      "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800 dark:text-zinc-400"
                    )}>
                      {p.payment_status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No payments recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Testimonials */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Testimonial</p>
            {!hasReceivedTestimonial && !hasRequestedTestimonial && (
              <Button variant="ghost" size="sm" onClick={handleRequestTestimonial} disabled={requestingTestimonial} className="h-7 text-xs gap-1">
                <MessageSquareQuote className="h-3 w-3" />Request
              </Button>
            )}
          </div>
          {testimonials.length === 0 ? (
            <p className="text-xs text-muted-foreground">No testimonial yet</p>
          ) : (
            <div className="space-y-2">
              {testimonials.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border",
                      t.status === "received" ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" :
                      "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                    )}>
                      {t.status === "received" ? "Received" : "Requested"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {new Date(t.requested_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {t.status === "pending" && (
                    <button
                      onClick={() => handleMarkTestimonialReceived(t.id)}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Mark received
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
