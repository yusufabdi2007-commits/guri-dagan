"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Globe, MapPin, Trash2, UserCheck, Clock, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

export interface FinanceTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  category: string;
  client_name: string | null;
  enrollment_id: string | null;
  payment_id: string | null;
  transaction_date: string;
  notes: string | null;
}

export interface PendingPayment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  enrollment_id: string;
  client_enrollments: { parent_name: string; program: string | null } | null;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function firstOfNextMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().split("T")[0];
}

export function FinanceClient({ transactions: initial, pendingPayments: initialPending }: { transactions: FinanceTransaction[]; pendingPayments: PendingPayment[] }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initial);
  const [pending, setPending] = useState(initialPending);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  // Manual transaction form
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txClientName, setTxClientName] = useState("");
  const [txNotes, setTxNotes] = useState("");

  // Quick add coaching client form
  const [clientName, setClientName] = useState("");
  const [childName, setChildName] = useState("");
  const [region, setRegion] = useState<"africa_arab" | "other" | null>("africa_arab");
  const [amountNow, setAmountNow] = useState("25");
  const [owesMore, setOwesMore] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState("");
  const [remainingDueDate, setRemainingDueDate] = useState(firstOfNextMonth());

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { totalIncome, totalExpenses, net, monthIncome, monthExpenses, byCategory } = useMemo(() => {
    let totalIncome = 0, totalExpenses = 0, monthIncome = 0, monthExpenses = 0;
    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      const isThisMonth = t.transaction_date.slice(0, 7) === thisMonthKey;
      if (t.type === "income") {
        totalIncome += t.amount;
        if (isThisMonth) monthIncome += t.amount;
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      } else {
        totalExpenses += t.amount;
        if (isThisMonth) monthExpenses += t.amount;
      }
    }
    return { totalIncome, totalExpenses, net: totalIncome - totalExpenses, monthIncome, monthExpenses, byCategory };
  }, [transactions, thisMonthKey]);

  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  async function handleAddTransaction() {
    const amount = parseFloat(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" as never });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txType,
          amount,
          category: txCategory || "Other",
          client_name: txClientName || null,
          notes: txNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { transaction } = await res.json();
      setTransactions(prev => [transaction, ...prev]);
      setTxDialogOpen(false);
      setTxAmount(""); setTxCategory(""); setTxClientName(""); setTxNotes(""); setTxType("income");
      toast({ title: "Transaction added" });
    } catch {
      toast({ title: "Could not add transaction", variant: "destructive" as never });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddCoachingClient() {
    if (!clientName.trim()) {
      toast({ title: "Client name is required", variant: "destructive" as never });
      return;
    }
    const amount = parseFloat(amountNow);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount for what they're paying now", variant: "destructive" as never });
      return;
    }
    let remaining = 0;
    if (owesMore) {
      remaining = parseFloat(remainingAmount);
      if (!Number.isFinite(remaining) || remaining <= 0) {
        toast({ title: "Enter a valid remaining amount", variant: "destructive" as never });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payments = [
        { amount, currency: "USD", payment_status: "paid" as const },
        ...(owesMore ? [{ amount: remaining, currency: "USD", payment_status: "pending" as const, payment_date: remainingDueDate }] : []),
      ];
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_name: clientName,
          child_name: childName || null,
          program: "Coaching",
          region,
          payments,
        }),
      });
      if (!res.ok) throw new Error();
      const { payments: created } = await res.json();
      const paidNow = created?.find((p: { payment_status: string }) => p.payment_status === "paid");
      const pendingRow = created?.find((p: { payment_status: string }) => p.payment_status === "pending");
      if (paidNow) {
        setTransactions(prev => [{
          id: paidNow.id,
          type: "income",
          amount: paidNow.amount,
          currency: paidNow.currency,
          category: "Coaching",
          client_name: clientName,
          enrollment_id: paidNow.enrollment_id,
          payment_id: paidNow.id,
          transaction_date: paidNow.payment_date,
          notes: null,
        }, ...prev]);
      }
      if (pendingRow) {
        setPending(prev => [...prev, {
          id: pendingRow.id,
          amount: pendingRow.amount,
          currency: pendingRow.currency,
          payment_date: pendingRow.payment_date,
          enrollment_id: pendingRow.enrollment_id,
          client_enrollments: { parent_name: clientName, program: "Coaching" },
        }]);
      }
      setClientDialogOpen(false);
      setClientName(""); setChildName(""); setRegion("africa_arab"); setAmountNow("25");
      setOwesMore(false); setRemainingAmount(""); setRemainingDueDate(firstOfNextMonth());
      toast({
        title: owesMore ? `Client added — $${amount} now, $${remaining} due later` : `Client added — $${amount}`,
        description: "Also added to Clients and Revenue",
      });
      router.refresh();
    } catch {
      toast({ title: "Could not add client", variant: "destructive" as never });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkPaid(paymentId: string) {
    setMarkingPaidId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "paid" }),
      });
      if (!res.ok) throw new Error();
      const { transaction } = await res.json();
      setPending(prev => prev.filter(p => p.id !== paymentId));
      if (transaction) setTransactions(prev => [transaction, ...prev]);
      toast({ title: "Marked as paid" });
      router.refresh();
    } catch {
      toast({ title: "Could not update payment", variant: "destructive" as never });
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: "Transaction removed" });
    } catch {
      toast({ title: "Could not remove transaction", variant: "destructive" as never });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <div className="flex justify-center mb-1"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
          <div className="text-lg font-bold text-foreground">{formatMoney(totalIncome, "USD")}</div>
          <div className="text-[10px] text-muted-foreground">Total Made</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <div className="flex justify-center mb-1"><TrendingDown className="h-4 w-4 text-rose-500" /></div>
          <div className="text-lg font-bold text-foreground">{formatMoney(totalExpenses, "USD")}</div>
          <div className="text-[10px] text-muted-foreground">Total Spent</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <div className="flex justify-center mb-1"><Wallet className="h-4 w-4 text-violet-500" /></div>
          <div className={cn("text-lg font-bold", net >= 0 ? "text-foreground" : "text-rose-500")}>{formatMoney(net, "USD")}</div>
          <div className="text-[10px] text-muted-foreground">Net Profit</div>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-2xl p-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">This month</span>
        <span className="font-semibold text-foreground">
          +{formatMoney(monthIncome, "USD")} / -{formatMoney(monthExpenses, "USD")}
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setClientDialogOpen(true)} className="rounded-2xl">
          <UserCheck className="h-4 w-4 mr-1.5" /> Add Coaching Client
        </Button>
        <Button variant="outline" onClick={() => setTxDialogOpen(true)} className="rounded-2xl">
          <Plus className="h-4 w-4 mr-1.5" /> Add Transaction
        </Button>
      </div>

      {/* Pending / upcoming payments */}
      {pending.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending / Due Later
          </p>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {p.client_enrollments?.parent_name || "Client"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Due {new Date(p.payment_date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatMoney(p.amount, p.currency)}</span>
                  <button
                    onClick={() => handleMarkPaid(p.id)}
                    disabled={markingPaidId === p.id}
                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                    title="Mark as paid"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {topCategories.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-foreground mb-3">Income by Category</p>
          <div className="space-y-2">
            {topCategories.map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{cat}</span>
                <span className="font-semibold text-foreground">{formatMoney(amount, "USD")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Transactions</p>
        {transactions.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              t.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"
            )}>
              {t.type === "income" ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-rose-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {t.client_name || t.category}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t.category} · {new Date(t.transaction_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <span className={cn("text-sm font-bold shrink-0", t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {t.type === "income" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
            </span>
            <button
              onClick={() => handleDelete(t.id)}
              disabled={deletingId === t.id}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-16">
            <Wallet className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add a coaching client or log a transaction to get started</p>
          </div>
        )}
      </div>

      {/* Add Coaching Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Coaching Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client (parent) name</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Amina Yusuf" />
            </div>
            <div>
              <Label>Child name (optional)</Label>
              <Input value={childName} onChange={e => setChildName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>1-month coaching price</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => { setRegion("africa_arab"); setAmountNow("25"); }}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    region === "africa_arab" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground mb-1">
                    <Globe className="h-3 w-3" /> Africa/Arab
                  </div>
                  <div className="text-lg font-bold text-foreground">$25</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setRegion("other"); setAmountNow("50"); }}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    region === "other" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3" /> Other
                  </div>
                  <div className="text-lg font-bold text-foreground">$50</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setRegion(null); setAmountNow(""); }}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    region === null ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="text-[9px] font-semibold text-muted-foreground mb-1">Custom</div>
                  <div className="text-lg font-bold text-foreground">$?</div>
                </button>
              </div>
            </div>

            <div>
              <Label>Amount paying now (USD)</Label>
              <Input type="number" min="0" step="0.01" value={amountNow} onChange={e => setAmountNow(e.target.value)} placeholder="0.00" />
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input type="checkbox" checked={owesMore} onChange={e => setOwesMore(e.target.checked)} className="h-4 w-4 rounded border-border" />
              They still owe part of this month's payment (e.g. paid $30, owes $20 later)
            </label>

            {owesMore && (
              <div className="grid grid-cols-2 gap-3 border border-border rounded-xl p-3">
                <div>
                  <Label className="text-xs">Remaining amount (USD)</Label>
                  <Input type="number" min="0" step="0.01" value={remainingAmount} onChange={e => setRemainingAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-xs">Due date</Label>
                  <Input type="date" value={remainingDueDate} onChange={e => setRemainingDueDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCoachingClient} disabled={submitting}>
              {submitting ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTxType("income")}
                className={cn("rounded-xl border py-2 text-sm font-medium transition-colors", txType === "income" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground")}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setTxType("expense")}
                className={cn("rounded-xl border py-2 text-sm font-medium transition-colors", txType === "expense" ? "border-rose-500 bg-rose-500/10 text-rose-600" : "border-border text-muted-foreground")}
              >
                Expense
              </button>
            </div>
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" min="0" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={txCategory} onChange={e => setTxCategory(e.target.value)} placeholder="e.g. Academy, Consultation, Software" />
            </div>
            <div>
              <Label>Client / source (optional)</Label>
              <Input value={txClientName} onChange={e => setTxClientName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction} disabled={submitting}>{submitting ? "Adding..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
