"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, Star, TrendingUp, BookOpen, Plus, Trash2, CheckCircle2, AlertTriangle, Award, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProgramBadgeClass, PROGRAM_NAMES } from "@/lib/programs";

interface Goal { id: string; goal_title: string; category: string; target_score: number; current_score: number; achieved: boolean; created_at: string; }
interface Checkin { id: string; week_number: number; confidence_score: number | null; resilience_score: number | null; emotional_regulation_score: number | null; communication_score: number | null; parent_notes: string | null; coach_notes: string | null; created_at: string; }
interface Milestone { id: string; title: string; description: string | null; category: string; achieved_at: string; }
interface Story { id: string; title: string; story: string | null; status: string; created_at: string; }
interface Enrollment { id: string; parent_name: string; program: string | null; }

interface ChildData {
  id: string;
  child_name: string;
  age: number | null;
  program: string | null;
  status: string;
  start_date: string;
  graduation_date: string | null;
  enrollment_id: string | null;
  child_goals: Goal[];
  progress_checkins: Checkin[];
  milestones: Milestone[];
  success_stories: Story[];
  client_enrollments: Enrollment | null;
}

interface Props {
  child: ChildData;
  enrollments: Enrollment[];
}

const GOAL_CATEGORIES = ["confidence", "resilience", "emotional_regulation", "communication", "self_respect", "responsibility", "leadership"];
const MILESTONE_PRESETS = ["First Breakthrough", "Improved Confidence", "Better Emotional Control", "Stronger Communication", "Leadership Moment", "Goal Achieved", "Overcame Fear"];

function avgScore(c: Checkin) {
  const vals = [c.confidence_score, c.resilience_score, c.emotional_regulation_score, c.communication_score].filter((v): v is number => v != null);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

const SCORE_AREA_LABELS: Record<string, string> = {
  confidence_score: "Confidence",
  resilience_score: "Resilience",
  emotional_regulation_score: "Emotional Reg.",
  communication_score: "Communication",
};

const STATUS_OPTIONS = ["active", "graduated", "paused", "withdrawn"];

export function ChildProfileClient({ child, enrollments }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "goals" | "checkins" | "milestones" | "story">("overview");

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [childName, setChildName] = useState(child.child_name);
  const [age, setAge] = useState(child.age?.toString() ?? "");
  const [program, setProgram] = useState(child.program ?? "");
  const [status, setStatus] = useState(child.status);
  const [saving, setSaving] = useState(false);

  // Add goal
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("confidence");
  const [goalTarget, setGoalTarget] = useState("8");

  // Add milestone
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneCategory, setMilestoneCategory] = useState("general");
  const [milestoneDesc, setMilestoneDesc] = useState("");

  // Story
  const story = child.success_stories[0] ?? null;
  const [storyTitle, setStoryTitle] = useState(story?.title ?? "");
  const [storyText, setStoryText] = useState(story?.story ?? "");
  const [storySaving, setStorySaving] = useState(false);

  // Sorted check-ins
  const sortedCheckins = [...child.progress_checkins].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  async function saveEdit() {
    setSaving(true);
    try {
      await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_name: childName, age: age ? parseInt(age) : null, program: program || null, status }),
      });
      router.refresh();
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  async function graduate() {
    if (!confirm("Graduate this child? This will freeze their progress record and mark graduation date.")) return;
    await fetch(`/api/children/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "graduated" }),
    });
    router.refresh();
  }

  async function deleteChild() {
    if (!confirm("Delete this child profile and all their data? This cannot be undone.")) return;
    await fetch(`/api/children/${child.id}`, { method: "DELETE" });
    router.push("/children");
  }

  async function addGoal() {
    if (!goalTitle.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: child.id, goal_title: goalTitle.trim(), category: goalCategory, target_score: parseInt(goalTarget) }),
    });
    if (res.ok) {
      router.refresh();
      setShowGoalForm(false);
      setGoalTitle("");
    }
  }

  async function addMilestone() {
    if (!milestoneTitle.trim()) return;
    const res = await fetch("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: child.id, title: milestoneTitle.trim(), description: milestoneDesc || null, category: milestoneCategory }),
    });
    if (res.ok) {
      router.refresh();
      setShowMilestoneForm(false);
      setMilestoneTitle("");
      setMilestoneDesc("");
    }
  }

  async function deleteMilestone(id: string) {
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveStory() {
    setStorySaving(true);
    try {
      if (story) {
        await fetch(`/api/success-stories/${story.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: storyTitle, story: storyText }),
        });
      } else {
        await fetch("/api/success-stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ child_id: child.id, title: storyTitle, story: storyText }),
        });
      }
      router.refresh();
    } finally {
      setStorySaving(false);
    }
  }

  async function updateStoryStatus(newStatus: string) {
    if (!story) return;
    await fetch(`/api/success-stories/${story.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  // Improvement calculation
  const improvement = sortedCheckins.length >= 2
    ? (() => {
        const first = avgScore(sortedCheckins[0]) ?? 0;
        const last = avgScore(sortedCheckins[sortedCheckins.length - 1]) ?? 0;
        return first > 0 ? Math.round(((last - first) / first) * 100) : 0;
      })()
    : 0;

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "goals", label: `Goals (${child.child_goals.length})` },
    { key: "checkins", label: `Check-ins (${child.progress_checkins.length})` },
    { key: "milestones", label: `Milestones (${child.milestones.length})` },
    { key: "story", label: "Story" },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

      {/* Back */}
      <Link href="/children" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />Back to Children
      </Link>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {editMode ? (
          <div className="space-y-3">
            <input value={childName} onChange={e => setChildName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
              <select value={status} onChange={e => setStatus(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <select value={program} onChange={e => setProgram(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
              <option value="">No program</option>
              {PROGRAM_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditMode(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-lg">{child.child_name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">{child.child_name}</h2>
                {child.age && <span className="text-xs text-muted-foreground">Age {child.age}</span>}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", {
                  active: "bg-emerald-500/10 text-emerald-600",
                  graduated: "bg-violet-500/10 text-violet-600",
                  paused: "bg-amber-500/10 text-amber-600",
                  withdrawn: "bg-zinc-500/10 text-zinc-500",
                }[child.status] ?? "bg-muted text-muted-foreground")}>{child.status}</span>
              </div>
              {child.program && (
                <span className={cn("inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded border", getProgramBadgeClass(child.program))}>
                  {child.program}
                </span>
              )}
              {child.client_enrollments && (
                <p className="text-xs text-muted-foreground mt-1">
                  Parent: <Link href={`/clients/${child.enrollment_id}`} className="text-primary hover:underline">{child.client_enrollments.parent_name}</Link>
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Started {new Date(child.start_date).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => setEditMode(true)} className="text-xs text-primary hover:underline">Edit</button>
              {child.status === "active" && (
                <button onClick={graduate} className="text-xs text-violet-600 hover:underline">Graduate</button>
              )}
              <button onClick={deleteChild} className="text-xs text-rose-500 hover:underline">Delete</button>
            </div>
          </div>
        )}

        {/* Quick stats */}
        {!editMode && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <div className="text-center">
              <p className="text-base font-bold text-foreground">{child.child_goals.filter(g => g.achieved).length}/{child.child_goals.length}</p>
              <p className="text-[10px] text-muted-foreground">Goals</p>
            </div>
            <div className="text-center">
              <p className={cn("text-base font-bold", improvement > 0 ? "text-emerald-500" : improvement < 0 ? "text-rose-500" : "text-foreground")}>
                {improvement > 0 ? "+" : ""}{improvement}%
              </p>
              <p className="text-[10px] text-muted-foreground">Improvement</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-foreground">{child.milestones.length}</p>
              <p className="text-[10px] text-muted-foreground">Milestones</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Latest scores */}
          {sortedCheckins.length > 0 && (() => {
            const latest = sortedCheckins[sortedCheckins.length - 1];
            return (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latest Scores (Week {latest.week_number})</p>
                <div className="space-y-2">
                  {Object.entries(SCORE_AREA_LABELS).map(([field, label]) => {
                    const score = (latest as Record<string, unknown>)[field] as number | null;
                    return (
                      <div key={field} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", score && score >= 7 ? "bg-emerald-500" : score && score >= 5 ? "bg-sky-500" : "bg-rose-400")}
                            style={{ width: score ? `${score * 10}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-6 text-right">{score ?? "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Recent milestones */}
          {child.milestones.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Milestones</p>
              {child.milestones.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-start gap-2">
                  <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(m.achieved_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {child.milestones.length > 3 && (
                <button onClick={() => setTab("milestones")} className="text-xs text-primary hover:underline">View all {child.milestones.length}</button>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/checkins" className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-sky-500/5 border border-sky-500/20 text-sm font-medium text-sky-600 dark:text-sky-400">
              <TrendingUp className="h-4 w-4" />Add Check-in
            </Link>
            <button onClick={() => { setTab("milestones"); setShowMilestoneForm(true); }} className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Star className="h-4 w-4" />Add Milestone
            </button>
          </div>
        </div>
      )}

      {/* Tab: Goals */}
      {tab === "goals" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goals</p>
            <button onClick={() => setShowGoalForm(v => !v)} className="flex items-center gap-1 text-xs text-primary font-medium">
              <Plus className="h-3 w-3" />Add Goal
            </button>
          </div>

          {showGoalForm && (
            <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
              <input
                placeholder="Goal title *"
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={goalCategory} onChange={e => setGoalCategory(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
                <select value={goalTarget} onChange={e => setGoalTarget(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {[6, 7, 8, 9, 10].map(n => <option key={n} value={n}>Target: {n}/10</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addGoal} disabled={!goalTitle.trim()} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Save</button>
                <button onClick={() => setShowGoalForm(false)} className="px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}

          {child.child_goals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No goals yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {child.child_goals.map(goal => (
                <div key={goal.id} className={cn("bg-card border rounded-2xl p-3 flex items-center gap-3", goal.achieved ? "border-emerald-500/30 bg-emerald-500/5" : "border-border")}>
                  <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0", goal.achieved ? "bg-emerald-500/10" : "bg-muted")}>
                    {goal.achieved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Target className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{goal.goal_title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{goal.category.replace("_", " ")}</span>
                      <span className="text-[10px] text-muted-foreground">{goal.current_score}/{goal.target_score}</span>
                    </div>
                    <div className="mt-1 w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", goal.achieved ? "bg-emerald-500" : "bg-primary")}
                        style={{ width: `${(goal.current_score / goal.target_score) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Check-ins */}
      {tab === "checkins" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weekly Check-ins</p>
            <Link href="/checkins" className="text-xs text-primary font-medium hover:underline">Add Check-in</Link>
          </div>
          {sortedCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No check-ins yet. Start tracking from the Check-ins page.</p>
          ) : (
            <div className="space-y-2">
              {[...sortedCheckins].reverse().map(c => {
                const avg = avgScore(c);
                return (
                  <div key={c.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Week {c.week_number}</p>
                      <div className="flex items-center gap-2">
                        {avg != null && (
                          <span className={cn("text-xs font-bold", avg >= 7 ? "text-emerald-500" : avg >= 5 ? "text-sky-500" : "text-rose-500")}>
                            {avg}/10 avg
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(SCORE_AREA_LABELS).map(([field, label]) => {
                        const score = (c as Record<string, unknown>)[field] as number | null;
                        return (
                          <div key={field} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{label}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", score && score >= 7 ? "bg-emerald-500" : "bg-primary")} style={{ width: score ? `${score * 10}%` : "0%" }} />
                            </div>
                            <span className="text-[10px] font-medium text-foreground w-4 text-right">{score ?? "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                    {c.coach_notes && <p className="text-[11px] text-muted-foreground italic">"{c.coach_notes}"</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Milestones */}
      {tab === "milestones" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Milestones</p>
            <button onClick={() => setShowMilestoneForm(v => !v)} className="flex items-center gap-1 text-xs text-primary font-medium">
              <Plus className="h-3 w-3" />Add
            </button>
          </div>

          {showMilestoneForm && (
            <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground mb-1">New Milestone</p>
              <div className="flex gap-2 flex-wrap">
                {MILESTONE_PRESETS.map(p => (
                  <button key={p} onClick={() => setMilestoneTitle(p)} className={cn("text-[10px] px-2 py-1 rounded-lg border transition-colors", milestoneTitle === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                    {p}
                  </button>
                ))}
              </div>
              <input
                placeholder="Or type a custom title"
                value={milestoneTitle}
                onChange={e => setMilestoneTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
              <input
                placeholder="Description (optional)"
                value={milestoneDesc}
                onChange={e => setMilestoneDesc(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
              <select value={milestoneCategory} onChange={e => setMilestoneCategory(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                {["general", ...GOAL_CATEGORIES].map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={addMilestone} disabled={!milestoneTitle.trim()} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Save</button>
                <button onClick={() => setShowMilestoneForm(false)} className="px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}

          {child.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No milestones yet.</p>
          ) : (
            <div className="space-y-2">
              {[...child.milestones].sort((a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime()).map(m => (
                <div key={m.id} className="flex items-start gap-3 bg-card border border-border rounded-2xl p-3">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize">{m.category.replace("_", " ")} • {new Date(m.achieved_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => deleteMilestone(m.id)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Story */}
      {tab === "story" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Story</p>
            {story && (
              <div className="flex gap-2">
                {story.status === "draft" && (
                  <button onClick={() => updateStoryStatus("approved")} className="text-xs text-sky-600 font-medium hover:underline">Approve</button>
                )}
                {story.status === "approved" && (
                  <button onClick={() => updateStoryStatus("published")} className="text-xs text-emerald-600 font-medium hover:underline">Publish</button>
                )}
                {story.status === "published" && (
                  <button onClick={() => updateStoryStatus("draft")} className="text-xs text-muted-foreground hover:underline">Unpublish</button>
                )}
              </div>
            )}
          </div>

          {story && (
            <div className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full", {
              draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              approved: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
              published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            }[story.status] ?? "bg-muted text-muted-foreground")}>
              {story.status.toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            <input
              placeholder="Story title (e.g. How Fatima found her voice)"
              value={storyTitle}
              onChange={e => setStoryTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
            />
            <textarea
              rows={8}
              placeholder={`Write ${child.child_name}'s transformation story here.\n\nBefore: ...\n\nTransformation: ...\n\nToday: ...`}
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <button
            onClick={saveStory}
            disabled={storySaving || !storyTitle.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {storySaving ? "Saving..." : story ? "Update Story" : "Save Story"}
          </button>

          {!story && child.milestones.length > 0 && (
            <div className="bg-muted/30 rounded-2xl p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Quick story builder from milestones:</p>
              {child.milestones.map(m => (
                <p key={m.id} className="text-xs text-muted-foreground">• {m.title}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
