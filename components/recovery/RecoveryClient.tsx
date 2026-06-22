"use client";

import { useState, useCallback } from "react";
import {
  Wrench, CheckCircle2, AlertTriangle, XCircle, Loader2,
  SortAsc, Calendar, ClipboardList, PlusCircle, History,
  Search, GraduationCap, CalendarRange, Eye, Archive,
  RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecoveryResult {
  action: string;
  message: string;
  changed: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface BackupRecord {
  id: string;
  week_start: string;
  label: string;
  post_count: number;
  created_at: string;
  restored_at: string | null;
}

type ActionState = "idle" | "running" | "done" | "error";

interface RepairTool {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: string;
  color: "blue" | "amber" | "emerald" | "purple" | "rose" | "sky";
}

const TOOLS: RepairTool[] = [
  {
    id: "fix_sort_order",
    label: "Fix Sort Order",
    description: "Assign correct sort_order to posts that are missing it, so the Today page shows posts in the right sequence.",
    icon: SortAsc,
    action: "fix_sort_order",
    color: "blue",
  },
  {
    id: "fix_week_dates",
    label: "Repair Week Dates",
    description: "Recalculate scheduled_dates for all posts based on the batch's week_start. Fixes posts that appear on wrong days.",
    icon: Calendar,
    action: "fix_week_dates",
    color: "amber",
  },
  {
    id: "repair_missing_posts",
    label: "Repair Missing Posts",
    description: "Create placeholder slots for any missing TikTok or YouTube posts in the current week's batch (up to 8 total).",
    icon: PlusCircle,
    action: "repair_missing_posts",
    color: "emerald",
  },
  {
    id: "detect_duplicates",
    label: "Detect Duplicate Posts",
    description: "Find TikTok or YouTube posts scheduled on the same date. Returns a list — you delete duplicates manually.",
    icon: Search,
    action: "detect_duplicates",
    color: "rose",
  },
  {
    id: "repair_history",
    label: "Repair History Records",
    description: "Add missing daily_completion records for any batch posts that are marked as posted but lack a completion entry.",
    icon: History,
    action: "repair_history",
    color: "purple",
  },
  {
    id: "recalculate_progress",
    label: "Recalculate Progress",
    description: "Count posted vs total posts for this week and verify the history records match. Read-only — nothing is changed.",
    icon: ClipboardList,
    action: "recalculate_progress",
    color: "sky",
  },
  {
    id: "validate_program_knowledge",
    label: "Validate Program Knowledge",
    description: "Check which of the 5 programs have curriculum uploaded and whether the extracted text meets quality thresholds.",
    icon: GraduationCap,
    action: "validate_program_knowledge",
    color: "emerald",
  },
  {
    id: "validate_batches",
    label: "Validate Weekly Batches",
    description: "Verify that all recent batch records have valid Monday week_start dates and correct structure.",
    icon: CalendarRange,
    action: "validate_batches",
    color: "blue",
  },
  {
    id: "rebuild_tomorrow",
    label: "Check Tomorrow Preview",
    description: "Look up what is scheduled for tomorrow and confirm the post title and platform are correct.",
    icon: Eye,
    action: "rebuild_tomorrow",
    color: "sky",
  },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600 dark:text-blue-400", btn: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600 dark:text-amber-400", btn: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600 dark:text-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/40", icon: "text-purple-600 dark:text-purple-400", btn: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600" },
  rose: { bg: "bg-rose-100 dark:bg-rose-900/40", icon: "text-rose-600 dark:text-rose-400", btn: "bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600" },
  sky: { bg: "bg-sky-100 dark:bg-sky-900/40", icon: "text-sky-600 dark:text-sky-400", btn: "bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600" },
};

function ToolCard({ tool }: { tool: RepairTool }) {
  const [state, setState] = useState<ActionState>("idle");
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const c = COLOR_MAP[tool.color];
  const Icon = tool.icon;

  const run = useCallback(async () => {
    setState("running");
    setResult(null);
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: tool.action }),
      });
      const data: RecoveryResult = await res.json();
      setResult(data);
      setState(data.error ? "error" : "done");
    } catch (e) {
      setResult({ action: tool.action, message: e instanceof Error ? e.message : "Unknown error", changed: 0, error: "Request failed" });
      setState("error");
    }
  }, [tool.action]);

  return (
    <div className="bg-white dark:bg-[#111] border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={cn("w-5 h-5", c.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tool.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{tool.description}</p>

          {/* Result */}
          {result && (
            <div className={cn(
              "mt-3 rounded-xl px-4 py-3 border text-xs",
              state === "error"
                ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50"
                : result.changed > 0
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50"
                  : "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700"
            )}>
              <div className="flex items-start gap-2">
                {state === "error"
                  ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  : result.changed > 0
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className={cn("font-medium",
                    state === "error" ? "text-red-700 dark:text-red-300" :
                    result.changed > 0 ? "text-emerald-700 dark:text-emerald-300" :
                    "text-gray-700 dark:text-gray-300"
                  )}>
                    {result.message}
                  </p>
                  {result.changed > 0 && (
                    <p className="text-gray-500 mt-0.5">{result.changed} record(s) changed</p>
                  )}
                  {result.details && (
                    <button
                      onClick={() => setDetailOpen(o => !o)}
                      className="flex items-center gap-1 text-gray-400 mt-1.5 hover:text-gray-600 transition-colors"
                    >
                      {detailOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {detailOpen ? "Hide" : "Show"} details
                    </button>
                  )}
                  {detailOpen && result.details && (
                    <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Run button */}
          <div className="mt-4">
            <button
              onClick={run}
              disabled={state === "running"}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-60",
                c.btn
              )}
            >
              {state === "running"
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</>
                : state === "done" || state === "error"
                  ? <><RefreshCw className="w-3.5 h-3.5" />Run Again</>
                  : <><Wrench className="w-3.5 h-3.5" />Run Repair</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackupSection() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const loadBackups = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/backup");
      if (res.ok) setBackups(await res.json());
    } finally {
      setLoadingList(false);
    }
  }, []);

  const createBackup = useCallback(async () => {
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();
      setMsg(res.ok ? data.message : `Error: ${data.error}`);
      if (res.ok) loadBackups();
    } finally {
      setCreating(false);
    }
  }, [loadBackups]);

  const restoreBackup = useCallback(async (id: string, label: string) => {
    if (!confirm(`Restore backup "${label}"? This will overwrite the current week's posts.`)) return;
    setRestoring(id);
    setMsg(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backup_id: id }),
      });
      const data = await res.json();
      setMsg(res.ok ? data.message : `Error: ${data.error}`);
      if (res.ok) loadBackups();
    } finally {
      setRestoring(null);
    }
  }, [loadBackups]);

  const toggleOpen = useCallback(() => {
    if (!open) loadBackups();
    setOpen(o => !o);
  }, [open, loadBackups]);

  return (
    <div className="bg-white dark:bg-[#111] border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
          <Archive className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Weekly Backups</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Snapshot and restore weekly plans</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Create a snapshot before regenerating a plan. If you accidentally overwrite good content, restore it here.
          </p>

          {/* Message */}
          {msg && (
            <div className={cn("rounded-xl px-4 py-3 text-xs border",
              msg.startsWith("Error")
                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300"
            )}>
              {msg}
            </div>
          )}

          {/* Create backup button */}
          <button
            onClick={createBackup}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
            {creating ? "Creating…" : "Backup Current Week"}
          </button>

          {/* List */}
          {loadingList ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading backups…
            </div>
          ) : backups.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No backups yet</p>
          ) : (
            <div className="space-y-2">
              {backups.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{b.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Week: {b.week_start} · {b.post_count} posts · {new Date(b.created_at).toLocaleString()}
                      {b.restored_at && <span className="ml-1 text-amber-500">(restored)</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreBackup(b.id, b.label)}
                    disabled={restoring === b.id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-800/50 disabled:opacity-50 transition-colors"
                  >
                    {restoring === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RecoveryClient() {
  return (
    <div className="space-y-5">

      {/* Warning banner */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Owner-Only Area</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              These tools modify your database. Each repair is idempotent — running it twice produces the same result. Always create a backup before major repairs.
            </p>
          </div>
        </div>
      </div>

      {/* Quick link to System Health */}
      <div className="flex items-center gap-3">
        <Link
          href="/system-health"
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#111] border border-border rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          View System Health Dashboard
        </Link>
      </div>

      {/* Backup section */}
      <BackupSection />

      {/* Section header */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Repair Tools</p>
        <div className="space-y-3">
          {TOOLS.map(tool => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      </div>
    </div>
  );
}
