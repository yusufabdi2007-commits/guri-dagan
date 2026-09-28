"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Globe, MapPin, Trash2, UserCheck,
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

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function FinanceClient({ transactions: initial }: { transactions: FinanceTransaction[] }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initial);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manual transaction form
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txClientName, setTxClientName] = useState("");
  const [txNotes, setTxNotes] = useState("");

  // Quick add coaching client form
  const [clientName, setClientName] = useState("");
  const [childName, setChildName] = useState("");
  const [region, setRegion] = useState<"africa_arab" | "other">("africa_arab");

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
    setSubmitting(true);
    try {
      const amount = region === "africa_arab" ? 25 : 50;
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_name: clientName,
          child_name: childName || null,
          program: "Coaching",
          region,
          initial_payment: { amount, currency: "USD" },
        }),
      });
      if (!res.ok) throw new Error();
      const { payment } = await res.json();
      if (payment) {
        setTransactions(prev => [{
          id: payment.id,
          type: "income",
          amount: payment.amount,
          currency: payment.currency,
          category: "Coaching",
          client_name: clientName,
          enrollment_id: payment.enrollment_id,
          payment_id: payment.id,
          transaction_date: payment.payment_date,
          notes: null,
        }, ...prev]);
      }
      setClientDialogOpen(false);
      setClientName(""); setChildName(""); setRegion("africa_arab");
      toast({ title: `Client added — $${amount}/month`, description: "Also added to Clients and Revenue" });
      router.refresh();
    } catch {
      toast({ title: "Could not add client", variant: "destructive" as never });
    } finally {
      setSubmitting(false);
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
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setRegion("africa_arab")}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    region === "africa_arab" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground mb-1">
                    <Globe className="h-3 w-3" /> Africa / Arab countries
                  </div>
                  <div className="text-xl font-bold text-foreground">$25</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRegion("other")}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    region === "other" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3" /> Other countries
                  </div>
                  <div className="text-xl font-bold text-foreground">$50</div>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCoachingClient} disabled={submitting}>
              {submitting ? "Adding..." : `Add Client — $${region === "africa_arab" ? 25 : 50}/mo`}
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
