"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Sparkles, Trash2, ChevronDown,
  CheckCircle2, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewPlayer } from "./ReviewPlayer";
import { ReviewSidebar } from "./ReviewSidebar";

export interface ReviewMarker {
  id: string;
  video_id: string;
  marker_type: string;
  timestamp_seconds: number;
  confidence_score: number;
  explanation: string | null;
  is_resolved: boolean;
  is_ai_generated: boolean;
}

export interface VideoReview {
  id: string;
  video_id: string;
  review_status: string;
  reviewer_notes: string | null;
  review_completed_at: string | null;
}

interface Video {
  id: string;
  title: string;
  url: string | null;
  thumbnail_url: string | null;
  platform: string;
  status: string;
  notes: string | null;
  views: number | null;
  recorded_at: string | null;
  edited_at: string | null;
}

interface ReviewClientProps {
  video: Video;
  initialReview: VideoReview | null;
  initialMarkers: ReviewMarker[];
}

const REVIEW_STATUSES = [
  { value: "needs_review", label: "Needs Review", color: "text-zinc-400", bg: "bg-zinc-800/80" },
  { value: "needs_fix", label: "Needs Fix", color: "text-red-400", bg: "bg-red-950/80" },
  { value: "approved", label: "Approved", color: "text-emerald-400", bg: "bg-emerald-950/80" },
  { value: "high_retention_candidate", label: "High Retention", color: "text-violet-400", bg: "bg-violet-950/80" },
  { value: "ready_for_export", label: "Ready for Export", color: "text-cyan-400", bg: "bg-cyan-950/80" },
];

function formatDate(str: string | null) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl",
      type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    )}>
      {message}
    </div>
  );
}

export function ReviewClient({ video, initialReview, initialMarkers }: ReviewClientProps) {
  const router = useRouter();
  const [markers, setMarkers] = useState<ReviewMarker[]>(initialMarkers);
  const [reviewStatus, setReviewStatus] = useState(initialReview?.review_status ?? "needs_review");
  const [reviewNotes, setReviewNotes] = useState(initialReview?.reviewer_notes ?? "");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const playerSeekRef = useRef<(time: number) => void>(() => {});

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  async function generateMarkers() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/review-markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          notes: video.notes,
          duration: duration || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMarkers(prev => {
        const manual = prev.filter(m => !m.is_ai_generated);
        return [...manual, ...data.markers].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
      });
      showToast(`${data.markers.length} markers generated`);
    } catch {
      showToast("Failed to generate markers", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function clearMarkers() {
    await fetch(`/api/review-markers?videoId=${video.id}`, { method: "DELETE" });
    setMarkers([]);
    showToast("Markers cleared");
  }

  async function handleMarkerResolve(markerId: string, resolved: boolean) {
    setMarkers(prev => prev.map(m => m.id === markerId ? { ...m, is_resolved: resolved } : m));
    await fetch("/api/review-markers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markerId, is_resolved: resolved }),
    });
  }

  async function handleStatusChange(newStatus: string) {
    setReviewStatus(newStatus);
    setStatusOpen(false);
    try {
      await fetch("/api/review-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, review_status: newStatus, reviewer_notes: reviewNotes }),
      });
      showToast("Status updated");
    } catch {
      showToast("Failed to save status", "error");
    }
  }

  async function saveNotes() {
    try {
      await fetch("/api/review-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, review_status: reviewStatus, reviewer_notes: reviewNotes }),
      });
      showToast("Notes saved");
    } catch {
      showToast("Failed to save notes", "error");
    }
  }

  const currentStatusConfig = REVIEW_STATUSES.find(s => s.value === reviewStatus) ?? REVIEW_STATUSES[0];
  const unresolvedCount = markers.filter(m => !m.is_resolved).length;
  const resolvedCount = markers.filter(m => m.is_resolved).length;
  const reviewProgress = markers.length > 0 ? Math.round((resolvedCount / markers.length) * 100) : 0;

  const sidebarProps = {
    markers,
    onMarkerClick: (time: number) => playerSeekRef.current(time),
    onMarkerResolve: handleMarkerResolve,
    reviewNotes,
    onNotesChange: setReviewNotes,
    onNotesSave: saveNotes,
    currentTime,
    videoId: video.id,
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#080808] flex flex-col overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-white/5 bg-[#0d0d0d] shrink-0">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{video.title}</h1>
          <p className="text-[10px] text-white/30 truncate">
            {video.platform}
            {video.recorded_at ? ` · Recorded ${formatDate(video.recorded_at)}` : ""}
            {markers.length > 0 ? ` · ${unresolvedCount} unresolved` : ""}
          </p>
        </div>

        {/* Review progress bar */}
        {markers.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-white/30">{reviewProgress}%</span>
          </div>
        )}

        {/* Status dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors",
              currentStatusConfig.bg, currentStatusConfig.color
            )}
          >
            <span className="hidden sm:inline">{currentStatusConfig.label}</span>
            <span className="sm:hidden">
              {reviewStatus === "approved" ? "✓" :
               reviewStatus === "needs_fix" ? "Fix" :
               reviewStatus === "ready_for_export" ? "Export" :
               reviewStatus === "high_retention" ? "HR" : "Review"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {statusOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                {REVIEW_STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5",
                      s.color,
                      reviewStatus === s.value && "bg-white/5"
                    )}
                  >
                    {s.label}
                    {reviewStatus === s.value && (
                      <CheckCircle2 className="inline h-3 w-3 ml-1.5 opacity-60" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Generate markers */}
        <button
          onClick={generateMarkers}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors shrink-0"
        >
          <Sparkles className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
          <span className="hidden sm:inline">{isGenerating ? "Generating..." : "AI Markers"}</span>
        </button>

        {/* Clear markers */}
        {markers.length > 0 && (
          <button
            onClick={clearMarkers}
            className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors shrink-0"
            title="Clear all markers"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Player section */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 gap-4 min-w-0 overflow-y-auto">
          {/* Empty state for when no markers yet */}
          {markers.length === 0 && !video.url && (
            <div className="text-center mb-4 max-w-xs">
              <Video className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No video URL set. Add a URL in Videos tracker to enable playback.</p>
            </div>
          )}

          <ReviewPlayer
            url={video.url ?? ""}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setDuration}
            seekRef={playerSeekRef}
            markers={markers}
            duration={duration}
          />

          {/* Quick status info below player on mobile */}
          {markers.length > 0 && (
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${reviewProgress}%` }} />
                </div>
                <span className="text-[10px] text-white/30">{reviewProgress}% reviewed</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex w-80 lg:w-96 border-l border-white/5 flex-col overflow-hidden shrink-0">
          <ReviewSidebar {...sidebarProps} />
        </div>
      </div>

      {/* Mobile markers sheet */}
      <MobileMarkersSheet {...sidebarProps} />
    </div>
  );
}

function MobileMarkersSheet(props: {
  markers: ReviewMarker[];
  onMarkerClick: (time: number) => void;
  onMarkerResolve: (id: string, resolved: boolean) => void;
  reviewNotes: string;
  onNotesChange: (v: string) => void;
  onNotesSave: () => void;
  currentTime: number;
  videoId: string;
}) {
  const [open, setOpen] = useState(false);
  const unresolvedCount = props.markers.filter(m => !m.is_resolved).length;

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-2xl border border-white/10 shadow-xl"
      >
        <span>Markers</span>
        {unresolvedCount > 0 && (
          <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {unresolvedCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 h-[72vh] bg-[#111111] border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <h3 className="text-sm font-semibold text-white mt-1">Review Markers</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white text-xs font-medium transition-colors mt-1"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ReviewSidebar
                {...props}
                onMarkerClick={(time) => {
                  props.onMarkerClick(time);
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
