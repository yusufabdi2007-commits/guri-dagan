"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass } from "@/lib/programs";

interface ActiveChild {
  id: string;
  child_name: string;
  program: string | null;
  status: string;
}

interface RecentCheckin {
  id: string;
  week_number: number;
  attendance: string | null;
  confidence_score: number | null;
  resilience_score: number | null;
  emotional_regulation_score: number | null;
  communication_score: number | null;
  responsibility_score: number | null;
  leadership_score: number | null;
  parent_notes: string | null;
  coach_notes: string | null;
  created_at: string;
  child_profiles: { id: string; child_name: string; program: string | null } | null;
}

interface Props {
  activeChildren: ActiveChild[];
  recentCheckins: RecentCheckin[];
}

const SCORE_LABELS = [
  { field: "confidence_score", label: "Confidence" },
  { field: "resilience_score", label: "Resilience" },
  { field: "emotional_regulation_score", label: "Emotional Reg." },
  { field: "communication_score", label: "Communication" },
  { field: "responsibility_score", label: "Responsibility" },
  { field: "leadership_score", label: "Leadership" },
];

function ScoreSlider({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = parseInt(value) || 5;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded-lg",
          n >= 8 ? "text-emerald-600 bg-emerald-500/10" : n >= 6 ? "text-sky-600 bg-sky-500/10" : n >= 4 ? "text-amber-600 bg-amber-500/10" : "text-rose-600 bg-rose-500/10"
        )}>{n}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={n}
        onChange={e => onChange(e.target.value)}
        className="w-full h-2 rounded-full accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>1 (Low)</span>
        <span>5</span>
        <span>10 (High)</span>
      </div>
    </div>
  );
}

function avgScore(c: RecentCheckin) {
  const vals = [c.confidence_score, c.resilience_score, c.emotional_regulation_score, c.communication_score, c.responsibility_score, c.leadership_score].filter((v): v is number => v != null);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

export function CheckinsClient({ activeChildren, recentCheckins }: Props) {
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState(activeChildren[0]?.id ?? "");
  const [weekNumber, setWeekNumber] = useState("1");
  const [attendance, setAttendance] = useState("attended");
  const [scores, setScores] = useState({ confidence_score: "5", resilience_score: "5", emotional_regulation_score: "5", communication_score: "5", responsibility_score: "5", leadership_score: "5" });
  const [parentNotes, setParentNotes] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setScore(field: string, val: string) {
    setScores(s => ({ ...s, [field]: val }));
  }

  async function handleSubmit() {
    if (!selectedChild) return;
    setSaving(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: selectedChild,
          week_number: parseInt(weekNumber),
          attendance,
          ...Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, parseInt(v)])),
          parent_notes: parentNotes || null,
          coach_notes: coachNotes || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
        setParentNotes("");
        setCoachNotes("");
      } else {
        toast({ title: "Could not save check-in — please try again", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  const childCheckins = recentCheckins.filter(c => c.child_profiles?.id === selectedChild);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Check-in form */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">New Weekly Check-in</p>

        {activeChildren.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No active children yet.</p>
            <Link href="/children" className="text-xs text-primary hover:underline mt-1 block">Add a child</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Child</label>
                <select
                  value={selectedChild}
                  onChange={e => setSelectedChild(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
                >
                  {activeChildren.map(c => (
                    <option key={c.id} value={c.id}>{c.child_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Week #</label>
                <input
                  type="number"
                  min={1}
                  value={weekNumber}
                  onChange={e => setWeekNumber(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {/* Attendance selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Attendance</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "attended", label: "Attended", Icon: CheckCircle2, color: "emerald" },
                  { value: "absent", label: "Absent", Icon: XCircle, color: "rose" },
                  { value: "late", label: "Late", Icon: Clock, color: "amber" },
                ].map(({ value, label, Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAttendance(value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all",
                      attendance === value
                        ? color === "emerald" ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : color === "rose" ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                          : "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4",
                      attendance === value
                        ? color === "emerald" ? "text-emerald-500"
                          : color === "rose" ? "text-rose-500"
                          : "text-amber-500"
                        : "text-muted-foreground"
                    )} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {SCORE_LABELS.map(({ field, label }) => (
                <ScoreSlider
                  key={field}
                  label={label}
                  value={scores[field as keyof typeof scores]}
                  onChange={val => setScore(field, val)}
                />
              ))}
            </div>

            <div className="space-y-2">
              <textarea
                placeholder="Parent notes (optional)"
                rows={2}
                value={parentNotes}
                onChange={e => setParentNotes(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm resize-none"
              />
              <textarea
                placeholder="Coach notes (optional)"
                rows={2}
                value={coachNotes}
                onChange={e => setCoachNotes(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !selectedChild}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-medium transition-all",
                saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground disabled:opacity-50"
              )}
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Check-in"}
            </button>
          </>
        )}
      </div>

      {/* Recent check-ins */}
      {recentCheckins.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Check-ins</p>
          <div className="space-y-2">
            {recentCheckins.slice(0, 15).map(c => {
              const avg = avgScore(c);
              const child = c.child_profiles;
              return (
                <Link
                  key={c.id}
                  href={child ? `/children/${child.id}` : "/children"}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{child?.child_name ?? "Unknown"}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">Week {c.week_number}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {child?.program && (
                        <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", getProgramBadgeClass(child.program))}>
                          {child.program.split(" ")[0]}
                        </span>
                      )}
                      {c.attendance && c.attendance !== "attended" && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                          c.attendance === "absent"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                        )}>
                          {c.attendance === "absent" ? "Absent" : "Late"}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {avg != null && (
                    <div className={cn("text-sm font-bold shrink-0", avg >= 7 ? "text-emerald-500" : avg >= 5 ? "text-sky-500" : "text-rose-500")}>
                      {avg}/10
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
