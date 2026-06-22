"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Shield, Calendar, FileText, Cpu, ChevronDown, ChevronUp,
  Activity, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthCheck {
  id: string;
  label: string;
  status: "healthy" | "warning" | "critical";
  message: string;
  detail?: string;
}

interface HealthGroup {
  label: string;
  checks: HealthCheck[];
}

interface HealthReport {
  overall: "healthy" | "warning" | "critical";
  checks: HealthCheck[];
  groups: HealthGroup[];
  meta: {
    todayStr: string;
    weekStart: string;
    nextWeekStart: string;
    checkedAt: string;
    latencyMs: number;
  };
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  "Core Infrastructure": Cpu,
  "This Week's Schedule": Calendar,
  "Today & Tomorrow": Activity,
  "Post Integrity": Shield,
  "History & Progress": Database,
  "Program Knowledge": FileText,
};

function StatusIcon({ status, className }: { status: "healthy" | "warning" | "critical"; className?: string }) {
  if (status === "healthy") return <CheckCircle2 className={cn("text-emerald-500", className)} />;
  if (status === "warning") return <AlertTriangle className={cn("text-amber-500", className)} />;
  return <XCircle className={cn("text-red-500", className)} />;
}

function statusBg(status: "healthy" | "warning" | "critical"): string {
  if (status === "healthy") return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50";
  if (status === "warning") return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50";
  return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50";
}

function groupWorstStatus(group: HealthGroup): "healthy" | "warning" | "critical" {
  if (group.checks.some(c => c.status === "critical")) return "critical";
  if (group.checks.some(c => c.status === "warning")) return "warning";
  return "healthy";
}

function CheckRow({ check }: { check: HealthCheck }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("border rounded-xl px-4 py-3 transition-all", statusBg(check.status))}>
      <button
        onClick={() => check.detail ? setOpen(o => !o) : undefined}
        className="w-full flex items-start gap-3 text-left"
      >
        <StatusIcon status={check.status} className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{check.label}</span>
            {check.detail && (
              open
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{check.message}</p>
          {open && check.detail && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5 border-t border-current/10 pt-1.5 font-mono">{check.detail}</p>
          )}
        </div>
      </button>
    </div>
  );
}

function GroupCard({ group }: { group: HealthGroup }) {
  const [open, setOpen] = useState(true);
  const worst = groupWorstStatus(group);
  const Icon = GROUP_ICONS[group.label] || Shield;
  const healthy = group.checks.filter(c => c.status === "healthy").length;
  const total = group.checks.length;

  return (
    <div className="bg-white dark:bg-[#111] border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          worst === "healthy" ? "bg-emerald-100 dark:bg-emerald-900/40" :
          worst === "warning" ? "bg-amber-100 dark:bg-amber-900/40" :
          "bg-red-100 dark:bg-red-900/40"
        )}>
          <Icon className={cn("w-4 h-4",
            worst === "healthy" ? "text-emerald-600 dark:text-emerald-400" :
            worst === "warning" ? "text-amber-600 dark:text-amber-400" :
            "text-red-600 dark:text-red-400"
          )} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{healthy}/{total} passing</p>
        </div>
        <StatusIcon status={worst} className="w-5 h-5" />
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {group.checks.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}
    </div>
  );
}

export function SystemHealthClient() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health-check");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthReport = await res.json();
      setReport(data);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run health check");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runCheck(); }, [runCheck]);

  const critCount = report?.checks.filter(c => c.status === "critical").length ?? 0;
  const warnCount = report?.checks.filter(c => c.status === "warning").length ?? 0;
  const okCount = report?.checks.filter(c => c.status === "healthy").length ?? 0;

  return (
    <div className="space-y-5">

      {/* Hero Status Banner */}
      <div className={cn(
        "rounded-2xl border-2 p-6 transition-all",
        loading ? "border-gray-200 bg-gray-50 dark:bg-[#111] dark:border-gray-800" :
        report?.overall === "healthy" ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-700/60" :
        report?.overall === "warning" ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-700/60" :
        "border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20 dark:border-red-700/60"
      )}>
        {loading ? (
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            <div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Running health checks…</p>
              <p className="text-sm text-gray-500">Checking all systems</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="text-base font-semibold text-red-700 dark:text-red-400">Health check failed</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : report ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <StatusIcon status={report.overall} className="w-8 h-8" />
              <div>
                <p className={cn("text-xl font-bold",
                  report.overall === "healthy" ? "text-emerald-700 dark:text-emerald-300" :
                  report.overall === "warning" ? "text-amber-700 dark:text-amber-300" :
                  "text-red-700 dark:text-red-300"
                )}>
                  {report.overall === "healthy" ? "System Health: Healthy" :
                   report.overall === "warning" ? "System Health: Warnings Detected" :
                   "System Health: Issues Found"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Today: {report.meta.todayStr} · Week: {report.meta.weekStart} · {report.meta.latencyMs}ms
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {critCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full font-medium">
                  <XCircle className="w-3.5 h-3.5" />{critCount} critical
                </span>
              )}
              {warnCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />{warnCount} warning
                </span>
              )}
              {okCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />{okCount} passing
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Run Again */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {lastRun ? `Last checked at ${lastRun}` : ""}
        </p>
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          {loading ? "Checking…" : "Run Again"}
        </button>
      </div>

      {/* Check Groups */}
      {report && (
        <div className="space-y-3">
          {report.groups.filter(g => g.checks.length > 0).map(group => (
            <GroupCard key={group.label} group={group} />
          ))}
        </div>
      )}

      {/* Timestamp footer */}
      {report && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Checked at {new Date(report.meta.checkedAt).toLocaleString()} · {report.checks.length} checks total
        </p>
      )}
    </div>
  );
}
