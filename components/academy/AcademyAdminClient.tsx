"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, GraduationCap, Copy, Check, Pencil, Trash2, ChevronRight, BookOpen, UsersRound, WalletCards, HelpCircle, X } from "lucide-react";

interface Track {
  id: string;
  name: string;
  age_range: string;
  total_weeks: number;
  price_amount: number;
  price_currency: string;
  weeks_per_payment: number;
  is_active: boolean;
  academy_chapters: { id: string }[];
}

interface Chapter {
  id: string;
  week_number: number;
  title: string;
  body: string | null;
  file_url: string | null;
  zoom_link: string | null;
  zoom_time: string | null;
}

interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  country: string | null;
  status: string;
  current_week: number;
  paid_at: string | null;
  username: string | null;
  renewal_due_at: string | null;
  academy_tracks: { name: string; age_range: string; total_weeks: number } | null;
}

const emptyTrackForm = { name: "", age_range: "", total_weeks: 8, price_amount: 40, price_currency: "USD", weeks_per_payment: 4 };
const emptyChapterForm = { week_number: 1, title: "", body: "", file_url: "", zoom_link: "", zoom_time: "" };
const emptyQuestionForm = { question: "", options: ["", ""], correct_index: 0 };

export function AcademyAdminClient({ initialTracks }: { initialTracks: Track[] }) {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(initialTracks[0]?.id || null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [savingTrack, setSavingTrack] = useState(false);

  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [savingChapter, setSavingChapter] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [examChapter, setExamChapter] = useState<Chapter | null>(null);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [loadingExamQuestions, setLoadingExamQuestions] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [rosterTrackId, setRosterTrackId] = useState<string>("all");
  const [issuedCreds, setIssuedCreds] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || null;

  const loadChapters = useCallback(async (trackId: string) => {
    setLoadingChapters(true);
    const res = await fetch(`/api/academy/admin/chapters?track_id=${trackId}`);
    const data = await res.json();
    setChapters(data.chapters || []);
    setLoadingChapters(false);
  }, []);

  useEffect(() => {
    if (selectedTrackId) loadChapters(selectedTrackId);
  }, [selectedTrackId, loadChapters]);

  const loadStudents = useCallback(async (trackId: string) => {
    setLoadingStudents(true);
    const url = trackId === "all" ? "/api/academy/admin/students" : `/api/academy/admin/students?track_id=${trackId}`;
    const res = await fetch(url);
    const data = await res.json();
    setStudents(data.students || []);
    setLoadingStudents(false);
  }, []);

  async function handleCreateTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackForm.name.trim() || !trackForm.age_range.trim()) return;
    setSavingTrack(true);
    const res = await fetch("/api/academy/admin/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...trackForm, sort_order: tracks.length }),
    });
    const data = await res.json();
    setSavingTrack(false);
    if (res.ok) {
      setTracks(prev => [...prev, { ...data.track, academy_chapters: [] }]);
      setTrackDialogOpen(false);
      setTrackForm(emptyTrackForm);
    }
  }

  async function handleFileUpload(file: File) {
    setUploadError("");
    setUploadingFile(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/academy/admin/chapters/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed. Please try again.");
        return;
      }
      setChapterForm(f => ({ ...f, file_url: data.url }));
    } catch {
      setUploadError("We could not connect. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrackId || !chapterForm.title.trim()) return;
    setSavingChapter(true);
    const res = editingChapterId
      ? await fetch(`/api/academy/admin/chapters/${editingChapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chapterForm),
        })
      : await fetch("/api/academy/admin/chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...chapterForm, track_id: selectedTrackId }),
        });
    setSavingChapter(false);
    if (res.ok) {
      const wasEditing = !!editingChapterId;
      setChapterDialogOpen(false);
      setEditingChapterId(null);
      setChapterForm({ ...emptyChapterForm, week_number: chapterForm.week_number + 1 });
      loadChapters(selectedTrackId);
      if (!wasEditing) {
        setTracks(prev => prev.map(t => t.id === selectedTrackId ? { ...t, academy_chapters: [...t.academy_chapters, { id: "tmp" }] } : t));
      }
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Could not save chapter", description: data.error || "Unknown error", variant: "destructive" as never });
    }
  }

  function openEditChapter(ch: Chapter) {
    setEditingChapterId(ch.id);
    setChapterForm({
      week_number: ch.week_number,
      title: ch.title,
      body: ch.body || "",
      file_url: ch.file_url || "",
      zoom_link: ch.zoom_link || "",
      zoom_time: ch.zoom_time || "",
    });
    setChapterDialogOpen(true);
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!selectedTrackId) return;
    if (!confirm("Delete this chapter? Students will lose access to it.")) return;
    setDeletingChapterId(chapterId);
    const res = await fetch(`/api/academy/admin/chapters/${chapterId}`, { method: "DELETE" });
    setDeletingChapterId(null);
    if (res.ok) {
      loadChapters(selectedTrackId);
      setTracks(prev => prev.map(t => t.id === selectedTrackId
        ? { ...t, academy_chapters: t.academy_chapters.filter(c => c.id !== chapterId) }
        : t));
    }
  }

  async function loadExamQuestions(chapterId: string) {
    setLoadingExamQuestions(true);
    const res = await fetch(`/api/academy/admin/exam-questions?chapter_id=${chapterId}`);
    const data = await res.json();
    setExamQuestions(data.questions || []);
    setLoadingExamQuestions(false);
  }

  function openExamManager(chapter: Chapter) {
    setExamChapter(chapter);
    setQuestionForm(emptyQuestionForm);
    setEditingQuestionId(null);
    setQuestionError("");
    loadExamQuestions(chapter.id);
  }

  function openEditQuestion(q: ExamQuestion) {
    setEditingQuestionId(q.id);
    setQuestionForm({ question: q.question, options: [...q.options], correct_index: q.correct_index });
    setQuestionError("");
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!examChapter) return;
    const trimmedOptions = questionForm.options.map(o => o.trim());
    if (!questionForm.question.trim() || trimmedOptions.some(o => !o)) {
      setQuestionError("Enter the question and fill in every answer option.");
      return;
    }
    setQuestionError("");
    setSavingQuestion(true);
    const res = editingQuestionId
      ? await fetch(`/api/academy/admin/exam-questions/${editingQuestionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: questionForm.question.trim(), options: trimmedOptions, correct_index: questionForm.correct_index }),
        })
      : await fetch("/api/academy/admin/exam-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter_id: examChapter.id, question: questionForm.question.trim(), options: trimmedOptions, correct_index: questionForm.correct_index, sort_order: examQuestions.length }),
        });
    const data = await res.json();
    setSavingQuestion(false);
    if (res.ok) {
      setQuestionForm(emptyQuestionForm);
      setEditingQuestionId(null);
      loadExamQuestions(examChapter.id);
    } else {
      setQuestionError(data.error || "Could not save this question.");
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!examChapter) return;
    if (!confirm("Delete this question?")) return;
    setDeletingQuestionId(questionId);
    const res = await fetch(`/api/academy/admin/exam-questions/${questionId}`, { method: "DELETE" });
    setDeletingQuestionId(null);
    if (res.ok) loadExamQuestions(examChapter.id);
  }

  // Renewal payment: unlocks the NEXT 4-week block for a student who already
  // has credentials (mark_paid handles the first block; this handles every
  // payment after that). Matches the monthly-course model, not week-by-week.
  async function handleRecordPayment(studentId: string) {
    setAdvancingId(studentId);
    const res = await fetch(`/api/academy/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record_payment" }),
    });
    setAdvancingId(null);
    if (res.ok) loadStudents(rosterTrackId);
  }

  async function handleMarkPaid(studentId: string) {
    setMarkingId(studentId);
    const res = await fetch(`/api/academy/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    });
    const data = await res.json();
    setMarkingId(null);
    if (res.ok) {
      setIssuedCreds(data.credentials);
      loadStudents(rosterTrackId);
    }
  }

  // Password reset for a student who already has credentials — regenerates ONLY
  // the password (username stays the same, unlocked weeks/status are untouched).
  // This is deliberately a different action from mark_paid/record_payment, which
  // both also change unlock progress — using mark_paid here previously reset an
  // already-active student's progress back to the first 4-week block by mistake.
  async function handleResetPassword(studentId: string) {
    if (!confirm("This generates a new password for this student — their old password will stop working. Continue?")) return;
    setMarkingId(studentId);
    const res = await fetch(`/api/academy/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reissue_credentials" }),
    });
    const data = await res.json();
    setMarkingId(null);
    if (res.ok) {
      setIssuedCreds(data.credentials);
      loadStudents(rosterTrackId);
    }
  }

  function copyCreds() {
    if (!issuedCreds) return;
    navigator.clipboard.writeText(
      `Guri Dagan Academy — u soo gal: guridagan.com/academy/login\nUsername: ${issuedCreds.username}\nPassword: ${issuedCreds.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full">
      <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Academy control room</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Build the course parents will return to.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Set up age tracks, prepare each week, and unlock access after payment.</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-background/70 text-center">
            <div className="px-3 py-2.5"><GraduationCap className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold">{tracks.length}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tracks</p></div>
            <div className="px-3 py-2.5"><BookOpen className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold">{tracks.reduce((total, track) => total + track.academy_chapters.length, 0)}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Chapters</p></div>
            <div className="px-3 py-2.5"><UsersRound className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold">{students.length || "-"}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Students</p></div>
          </div>
        </div>
      </section>
      <Tabs defaultValue="tracks" onValueChange={v => { if (v === "roster") loadStudents(rosterTrackId); }}>
        <TabsList className="rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="tracks">Tracks &amp; Chapters</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold">Course pathways</p><p className="text-xs text-muted-foreground">{tracks.length} track{tracks.length === 1 ? "" : "s"} ready to manage</p></div>
            <Button size="sm" onClick={() => setTrackDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Track
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tracks.map(track => (
              <button
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`text-left p-4 rounded-2xl border transition-all card-hover ${
                  selectedTrackId === track.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{track.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{track.age_range}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{track.academy_chapters.length}/{track.total_weeks} weeks</Badge>
                  <Badge variant="outline">${track.price_amount}/mo</Badge>
                </div>
              </button>
            ))}
          </div>

          {selectedTrack && (
            <div className="border border-border rounded-3xl bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold">{selectedTrack.name} — weekly chapters</h3><p className="text-xs text-muted-foreground mt-0.5">What the students see one week at a time.</p></div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingChapterId(null);
                    setChapterForm({ ...emptyChapterForm, week_number: chapters.length + 1 });
                    setChapterDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Chapter
                </Button>
              </div>

              {loadingChapters ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chapters yet — add Week 1 to get started.</p>
              ) : (
                <div className="space-y-2">
                  {chapters.map(ch => (
                    <div key={ch.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 text-sm">
                      <Badge>Week {ch.week_number}</Badge>
                      <span className="font-medium flex-1">{ch.title}</span>
                      {ch.zoom_link && <Badge variant="outline">Zoom set</Badge>}
                      <button onClick={() => openExamManager(ch)} className="p-1.5 rounded-lg hover:bg-muted" title="End-of-week check-in questions">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => openEditChapter(ch)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(ch.id)}
                        disabled={deletingChapterId === ch.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10"
                        title="Delete"
                      >
                        {deletingChapterId === ch.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold text-sm">Student roster</p><p className="text-xs text-muted-foreground">Confirm payment, then give families their course access.</p></div>
            <Select value={rosterTrackId} onValueChange={v => { setRosterTrackId(v); loadStudents(v); }}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All tracks" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracks</SelectItem>
                {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.age_range})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingStudents ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students registered yet.</p>
          ) : (
            <div className="space-y-2">
              {students.map(s => {
                const totalWeeks = s.academy_tracks?.total_weeks;
                const isActive = s.status === "active";
                const isCompleted = s.status === "completed";
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-border bg-card text-sm shadow-sm">
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.phone}{s.country ? ` · ${s.country}` : ""} · {s.academy_tracks?.name} ({s.academy_tracks?.age_range})
                      </p>
                      {s.username && <p className="text-[11px] text-muted-foreground font-mono">login: {s.username}</p>}
                      {s.renewal_due_at && (
                        <p className="text-[11px] text-muted-foreground">
                          next payment due {new Date(s.renewal_due_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {s.status === "pending_payment" ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-300"><WalletCards className="mr-1 h-3 w-3" />Unpaid</Badge>
                    ) : isCompleted ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">Completed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Unlocked through week {s.current_week}{totalWeeks ? ` of ${totalWeeks}` : ""}
                      </Badge>
                    )}
                    {s.status === "pending_payment" ? (
                      <Button size="sm" disabled={markingId === s.id} onClick={() => handleMarkPaid(s.id)}>
                        {markingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Paid"}
                      </Button>
                    ) : (
                      <>
                        {isActive && (
                          <Button size="sm" disabled={advancingId === s.id} onClick={() => handleRecordPayment(s.id)}>
                            {advancingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Record Next Payment <ChevronRight className="h-4 w-4 ml-0.5" /></>}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={markingId === s.id} onClick={() => handleResetPassword(s.id)}>
                          Reset Password
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Track Dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Track</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTrack} className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Toddlers" />
            </div>
            <div className="space-y-1">
              <Label>Age range</Label>
              <Input value={trackForm.age_range} onChange={e => setTrackForm(f => ({ ...f, age_range: e.target.value }))} placeholder="e.g. 1-3 years" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Total weeks</Label>
                <Input type="number" value={trackForm.total_weeks} onChange={e => setTrackForm(f => ({ ...f, total_weeks: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Price per month</Label>
                <Input type="number" value={trackForm.price_amount} onChange={e => setTrackForm(f => ({ ...f, price_amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Weeks unlocked per payment</Label>
              <Input type="number" value={trackForm.weeks_per_payment} onChange={e => setTrackForm(f => ({ ...f, weeks_per_payment: Number(e.target.value) }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTrackDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingTrack}>{savingTrack ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Chapter Dialog */}
      <Dialog open={chapterDialogOpen} onOpenChange={(open) => { setChapterDialogOpen(open); if (!open) { setEditingChapterId(null); setUploadError(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingChapterId ? "Edit Chapter" : "Add Chapter"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveChapter} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Week number</Label>
                <Input type="number" value={chapterForm.week_number} onChange={e => setChapterForm(f => ({ ...f, week_number: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Zoom time</Label>
                <Input value={chapterForm.zoom_time} onChange={e => setChapterForm(f => ({ ...f, zoom_time: e.target.value }))} placeholder="Thu 7pm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={chapterForm.title} onChange={e => setChapterForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Building daily routines" />
            </div>
            <div className="space-y-1">
              <Label>Chapter content / notes</Label>
              <Textarea rows={4} value={chapterForm.body} onChange={e => setChapterForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Chapter material</Label>
              <div className="flex items-center gap-2">
                <Input value={chapterForm.file_url} onChange={e => setChapterForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://... or upload a file" className="flex-1" />
                <Button type="button" variant="outline" size="sm" disabled={uploadingFile} onClick={() => document.getElementById("chapter-file-input")?.click()}>
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                </Button>
                <input
                  id="chapter-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,image/png,image/jpeg"
                  className="hidden"
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ""; }}
                />
              </div>
              <p className="text-xs text-muted-foreground">PDF, Word doc, or image — up to 20MB. Or paste a link (Google Drive, Zoom, etc.) directly.</p>
              {uploadError && <p className="text-xs font-medium text-destructive">{uploadError}</p>}
            </div>
            <div className="space-y-1">
              <Label>Zoom link</Label>
              <Input value={chapterForm.zoom_link} onChange={e => setChapterForm(f => ({ ...f, zoom_link: e.target.value }))} placeholder="https://zoom.us/..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChapterDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingChapter}>{savingChapter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* End-of-week check-in questions for a chapter */}
      <Dialog open={!!examChapter} onOpenChange={(open) => { if (!open) { setExamChapter(null); setEditingQuestionId(null); setQuestionForm(emptyQuestionForm); setQuestionError(""); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Week {examChapter?.week_number} check-in — {examChapter?.title}</DialogTitle>
          </DialogHeader>

          {loadingExamQuestions ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : examQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet — students won&apos;t see a check-in for this week until you add at least one.</p>
          ) : (
            <div className="space-y-2">
              {examQuestions.map((q, i) => (
                <div key={q.id} className="rounded-2xl border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium flex-1">{i + 1}. {q.question}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditQuestion(q)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        disabled={deletingQuestionId === q.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10"
                        title="Delete"
                      >
                        {deletingQuestionId === q.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                      </button>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => (
                      <li key={oi} className={`text-xs ${oi === q.correct_index ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}>
                        {oi === q.correct_index ? "✓ " : "· "}{opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSaveQuestion} className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{editingQuestionId ? "Edit question" : "Add a question"}</p>
            <div className="space-y-1">
              <Label>Question</Label>
              <Input value={questionForm.question} onChange={e => setQuestionForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. What's the first step when your toddler has a tantrum?" />
            </div>
            <div className="space-y-2">
              <Label>Answer options — select the correct one</Label>
              {questionForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_option"
                    checked={questionForm.correct_index === i}
                    onChange={() => setQuestionForm(f => ({ ...f, correct_index: i }))}
                    className="accent-primary"
                  />
                  <Input
                    value={opt}
                    onChange={e => setQuestionForm(f => ({ ...f, options: f.options.map((o, oi) => oi === i ? e.target.value : o) }))}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1"
                  />
                  {questionForm.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setQuestionForm(f => ({
                        ...f,
                        options: f.options.filter((_, oi) => oi !== i),
                        correct_index: f.correct_index === i ? 0 : f.correct_index > i ? f.correct_index - 1 : f.correct_index,
                      }))}
                      className="p-1.5 rounded-lg hover:bg-destructive/10"
                      title="Remove option"
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              {questionForm.options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setQuestionForm(f => ({ ...f, options: [...f.options, ""] }))}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                </Button>
              )}
            </div>
            {questionError && <p className="text-xs font-medium text-destructive">{questionError}</p>}
            <DialogFooter>
              {editingQuestionId && (
                <Button type="button" variant="outline" onClick={() => { setEditingQuestionId(null); setQuestionForm(emptyQuestionForm); setQuestionError(""); }}>
                  Cancel edit
                </Button>
              )}
              <Button type="submit" disabled={savingQuestion}>
                {savingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : editingQuestionId ? "Save changes" : "Add question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issued credentials — shown once, mom copies to send via WhatsApp */}
      <Dialog open={!!issuedCreds} onOpenChange={() => setIssuedCreds(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Login details ready</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy this and send it to the student on WhatsApp. It won&apos;t be shown again — use &quot;Reset Password&quot; if they lose it.
          </p>
          <div className="rounded-xl bg-muted/40 p-4 space-y-1 font-mono text-sm">
            <p>Username: {issuedCreds?.username}</p>
            <p>Password: {issuedCreds?.password}</p>
          </div>
          <DialogFooter>
            <Button onClick={copyCreds}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied" : "Copy message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
