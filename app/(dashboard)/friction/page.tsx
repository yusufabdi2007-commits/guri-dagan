"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { AlertTriangle, Trash2, TrendingUp, Zap, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Impact = "low" | "medium" | "high";

interface FrictionEntry {
  id: string;
  what: string;
  impact: Impact;
  ts: number;
  page: string;
}

const STORAGE_KEY = "friction_log";

function loadEntries(): FrictionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const IMPACT_CONFIG: Record<Impact, { label: string; color: string; icon: React.ElementType }> = {
  high:   { label: "High",   color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",   icon: AlertCircle },
  medium: { label: "Medium", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", icon: AlertTriangle },
  low:    { label: "Low",    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",   icon: Zap },
};

export default function FrictionPage() {
  const [entries, setEntries] = useState<FrictionEntry[]>([]);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  function deleteEntry(id: string) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }

  function clearAll() {
    setEntries([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  const highCount = entries.filter(e => e.impact === "high").length;
  const mediumCount = entries.filter(e => e.impact === "medium").length;
  const topPages = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.page] = (acc[e.page] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Friction Log" subtitle="Where the workflow slows down" />

      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Summary */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="card-hover">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{entries.length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Total logged</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-rose-500">{highCount}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">High impact</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">{mediumCount}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Medium impact</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top friction pages */}
        {topPages.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Most friction</span>
              </div>
              <div className="space-y-2">
                {topPages.map(([page, count]) => (
                  <div key={page} className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{page}</span>
                    <span className="text-xs font-bold text-foreground">{count}×</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">No friction logged yet.</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              When something in the workflow slows you down, tap the triangle icon to capture it.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{entries.length} friction point{entries.length !== 1 ? "s" : ""}</p>
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>

            <div className="space-y-3">
              {entries.map(entry => {
                const cfg = IMPACT_CONFIG[entry.impact];
                const Icon = cfg.icon;
                return (
                  <Card key={entry.id} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label} impact
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{entry.page}</span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{entry.what}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {new Date(entry.ts).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
