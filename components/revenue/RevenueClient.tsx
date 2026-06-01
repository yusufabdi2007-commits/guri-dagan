"use client";

import { Shield, PoundSterling, TrendingUp, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass } from "@/lib/programs";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_status: string;
  client_enrollments: { parent_name: string; program: string | null } | null;
}

interface Props {
  totalRevenue: number;
  activeClients: number;
  avgRevenue: number;
  highestProgram: string | null;
  programRevenue: Record<string, number>;
  monthlyRevenue: [string, number][];
  topClients: { id: string; name: string; amount: number; program: string | null }[];
  recentPayments: Payment[];
}

function formatMonth(yyyyMM: string) {
  const [year, month] = yyyyMM.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function RevenueClient({
  totalRevenue, activeClients, avgRevenue, highestProgram,
  programRevenue, monthlyRevenue, topClients, recentPayments
}: Props) {
  const maxMonth = Math.max(...monthlyRevenue.map(([, v]) => v), 1);
  const maxProgram = Math.max(...Object.values(programRevenue), 1);
  const maxClient = Math.max(...topClients.map(c => c.amount), 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <PoundSterling className="h-4 w-4 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">£{totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total Revenue</div>
        </div>
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
          <Users className="h-4 w-4 text-sky-500 mb-2" />
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{activeClients}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Active Clients</div>
        </div>
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4">
          <TrendingUp className="h-4 w-4 text-violet-500 mb-2" />
          <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">£{avgRevenue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Avg per Client</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <Star className="h-4 w-4 text-amber-500 mb-2" />
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 leading-tight mt-1">{highestProgram ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Highest Revenue Program</div>
        </div>
      </div>

      {/* Monthly chart */}
      {monthlyRevenue.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-4">Monthly Revenue</p>
          <div className="flex items-end gap-2 h-32">
            {monthlyRevenue.map(([month, amount]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground">£{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}</span>
                <div
                  className="w-full rounded-t-lg bg-primary/70 transition-all duration-500"
                  style={{ height: `${Math.max((amount / maxMonth) * 96, 4)}px` }}
                />
                <span className="text-[9px] text-muted-foreground">{formatMonth(month)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue by program */}
      {Object.keys(programRevenue).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Revenue by Program</p>
          <div className="space-y-3">
            {Object.entries(programRevenue)
              .sort((a, b) => b[1] - a[1])
              .map(([prog, amount]) => (
                <div key={prog} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1", getProgramBadgeClass(prog))}>
                      <Shield className="h-2 w-2" />{prog}
                    </span>
                    <span className="text-sm font-bold text-foreground">£{amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${(amount / maxProgram) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top clients */}
      {topClients.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Top Clients by Revenue</p>
          <div className="space-y-2">
            {topClients.map((client, i) => (
              <div key={client.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground truncate">{client.name}</span>
                    {client.program && (
                      <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border shrink-0", getProgramBadgeClass(client.program))}>
                        {client.program.split(" ")[0]}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${(client.amount / maxClient) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">£{client.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payments */}
      {recentPayments.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Recent Payments</p>
          </div>
          <div className="divide-y divide-border">
            {recentPayments.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {(p.client_enrollments as { parent_name?: string } | null)?.parent_name ?? "Unknown"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(p.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold",
                    p.payment_status === "paid" ? "text-emerald-600 dark:text-emerald-400" :
                    p.payment_status === "pending" ? "text-amber-600 dark:text-amber-400" :
                    "text-zinc-400 line-through"
                  )}>
                    £{p.amount.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-muted-foreground capitalize">{p.payment_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalRevenue === 0 && (
        <div className="text-center py-16">
          <PoundSterling className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No revenue recorded yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add payments from a client profile to track revenue</p>
        </div>
      )}
    </div>
  );
}
