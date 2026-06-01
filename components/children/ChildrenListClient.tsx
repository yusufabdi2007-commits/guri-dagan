"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass, PROGRAM_NAMES } from "@/lib/programs";

interface ChildRow {
  id: string;
  child_name: string;
  age: number | null;
  program: string | null;
  status: string;
  start_date: string;
  graduation_date: string | null;
  enrollment_id: string | null;
  progressPct: number;
  latestScore: number | null;
  latestCheckinDate: string | null;
  parentName: string | null;
}

interface Props {
  children: ChildRow[];
}

const STATUS_FILTERS = ["all", "active", "graduated", "paused"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusDotClass(s: string) {
  return { active: "bg-emerald-500", graduated: "bg-violet-500", paused: "bg-amber-500", withdrawn: "bg-zinc-400" }[s] ?? "bg-zinc-400";
}

export function ChildrenListClient({ children }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("");
  const [program, setProgram] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = filter === "all" ? children : children.filter(c => c.status === filter);

  async function handleAdd() {
    if (!childName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_name: childName.trim(), age: age || null, program: program || null }),
      });
      if (res.ok) {
        const { child } = await res.json();
        router.push(`/children/${child.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {statusLabel(f)} {f === "all" ? `(${children.length})` : `(${children.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Child
        </button>
      </div>

      {/* Add child form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">New Child Profile</p>
          <input
            type="text"
            placeholder="Child name *"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Age"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
            />
            <select
              value={program}
              onChange={e => setProgram(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">Program (optional)</option>
              {PROGRAM_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !childName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Profile"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium text-foreground mb-1">No children</p>
          <p className="text-xs text-muted-foreground">Add a child profile above to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(child => (
            <Link
              key={child.id}
              href={`/children/${child.id}`}
              className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">{child.child_name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", statusDotClass(child.status))} />
                  <p className="text-sm font-semibold text-foreground truncate">{child.child_name}</p>
                  {child.age && <span className="text-[10px] text-muted-foreground shrink-0">Age {child.age}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {child.program && (
                    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", getProgramBadgeClass(child.program))}>
                      {child.program.split(" ")[0]}
                    </span>
                  )}
                  {child.parentName && (
                    <span className="text-[10px] text-muted-foreground">Parent: {child.parentName}</span>
                  )}
                  {child.latestScore != null && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <TrendingUp className="h-2.5 w-2.5" />{child.latestScore}/10
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {child.progressPct > 0 && (
                  <div className="mt-1.5 w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", child.progressPct >= 80 ? "bg-emerald-500" : "bg-primary")}
                      style={{ width: `${child.progressPct}%` }}
                    />
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
