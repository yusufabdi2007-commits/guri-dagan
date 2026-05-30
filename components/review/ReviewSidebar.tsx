"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewMarker } from "./ReviewClient";

const MARKER_CONFIG: Record<string, {
  bg: string; text: string; dot: string; shortLabel: string;
}> = {
  "Hook": {
    bg: "bg-violet-500/10 border border-violet-500/20",
    text: "text-violet-400",
    dot: "bg-violet-500",
    shortLabel: "Hook",
  },
  "Emotional Peak": {
    bg: "bg-rose-500/10 border border-rose-500/20",
    text: "text-rose-400",
    dot: "bg-rose-500",
    shortLabel: "Peak",
  },
  "Dead Zone": {
    bg: "bg-red-500/10 border border-red-500/20",
    text: "text-red-400",
    dot: "bg-red-500",
    shortLabel: "Dead Zone",
  },
  "Silence Gap": {
    bg: "bg-zinc-500/10 border border-zinc-600/20",
    text: "text-zinc-400",
    dot: "bg-zinc-400",
    shortLabel: "Silence",
  },
  "Replay-Worthy": {
    bg: "bg-cyan-500/10 border border-cyan-500/20",
    text: "text-cyan-400",
    dot: "bg-cyan-400",
    shortLabel: "Replay",
  },
  "Retention Opportunity": {
    bg: "bg-amber-500/10 border border-amber-500/20",
    text: "text-amber-400",
    dot: "bg-amber-400",
    shortLabel: "Retention",
  },
  "Strong CTA": {
    bg: "bg-emerald-500/10 border border-emerald-500/20",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    shortLabel: "CTA",
  },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unresolved", label: "Unresolved" },
  { value: "Hook", label: "Hooks" },
  { value: "Emotional Peak", label: "Peaks" },
  { value: "Dead Zone", label: "Issues" },
  { value: "Replay-Worthy", label: "Replay" },
  { value: "resolved", label: "Resolved" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ReviewSidebarProps {
  markers: ReviewMarker[];
  onMarkerClick: (time: number) => void;
  onMarkerResolve: (id: string, resolved: boolean) => void;
  reviewNotes: string;
  onNotesChange: (v: string) => void;
  onNotesSave: () => void;
  currentTime: number;
  videoId: string;
}

export function ReviewSidebar({
  markers,
  onMarkerClick,
  onMarkerResolve,
  reviewNotes,
  onNotesChange,
  onNotesSave,
  currentTime,
}: ReviewSidebarProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"markers" | "notes">("markers");

  const filteredMarkers = markers.filter(m => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unresolved") return !m.is_resolved;
    if (activeFilter === "resolved") return m.is_resolved;
    return m.marker_type === activeFilter;
  });

  const unresolvedCount = markers.filter(m => !m.is_resolved).length;
  const issueCount = markers.filter(m =>
    !m.is_resolved && ["Dead Zone", "Silence Gap", "Retention Opportunity"].includes(m.marker_type)
  ).length;

  // Find marker nearest to current playhead (within 5s, not resolved)
  const nearbyMarker = markers
    .filter(m => !m.is_resolved)
    .sort((a, b) => Math.abs(a.timestamp_seconds - currentTime) - Math.abs(b.timestamp_seconds - currentTime))
    .find(m => Math.abs(m.timestamp_seconds - currentTime) <= 5);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-hidden">

      {/* Tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        <button
          onClick={() => setActiveTab("markers")}
          className={cn(
            "flex-1 py-3 text-xs font-semibold transition-colors relative",
            activeTab === "markers" ? "text-white" : "text-white/30 hover:text-white/50"
          )}
        >
          Markers
          {unresolvedCount > 0 && (
            <span className="ml-1.5 bg-violet-500/20 text-violet-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {unresolvedCount}
            </span>
          )}
          {activeTab === "markers" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={cn(
            "flex-1 py-3 text-xs font-semibold transition-colors relative",
            activeTab === "notes" ? "text-white" : "text-white/30 hover:text-white/50"
          )}
        >
          Notes
          {activeTab === "notes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
          )}
        </button>
      </div>

      {/* MARKERS TAB */}
      {activeTab === "markers" && (
        <>
          {/* Nearby marker contextual alert */}
          {nearbyMarker && (
            <div className={cn(
              "mx-3 mt-3 px-3 py-2.5 rounded-xl text-xs shrink-0",
              MARKER_CONFIG[nearbyMarker.marker_type]?.bg ?? "bg-white/5 border border-white/10"
            )}>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wide mb-0.5",
                MARKER_CONFIG[nearbyMarker.marker_type]?.text ?? "text-white/50"
              )}>
                {nearbyMarker.marker_type} nearby
              </p>
              <p className="text-white/50 leading-snug">{nearbyMarker.explanation}</p>
            </div>
          )}

          {/* Filter chips */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-medium transition-colors",
                    activeFilter === f.value
                      ? "bg-white/15 text-white"
                      : "text-white/25 hover:text-white/50 hover:bg-white/5"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats row */}
          {markers.length > 0 && (
            <div className="px-3 pb-2 shrink-0">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-white/25">{markers.length} total</span>
                {issueCount > 0 && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-amber-400/60">{issueCount} issues</span>
                  </>
                )}
                {markers.filter(m => m.is_resolved).length > 0 && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-emerald-400/60">{markers.filter(m => m.is_resolved).length} resolved</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Marker list */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 scrollbar-hide">
            {filteredMarkers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <p className="text-3xl mb-3 opacity-30">🎯</p>
                <p className="text-white/25 text-xs font-medium">
                  {markers.length === 0
                    ? "Press AI Markers to analyse this video"
                    : "No markers match this filter"}
                </p>
              </div>
            ) : (
              filteredMarkers.map(marker => {
                const config = MARKER_CONFIG[marker.marker_type] ?? {
                  bg: "bg-white/5 border border-white/10",
                  text: "text-white/50",
                  dot: "bg-white/40",
                  shortLabel: marker.marker_type,
                };
                const isNearby = Math.abs(marker.timestamp_seconds - currentTime) <= 5 && !marker.is_resolved;

                return (
                  <div
                    key={marker.id}
                    className={cn(
                      "p-3 rounded-xl transition-all duration-200",
                      marker.is_resolved
                        ? "opacity-35 bg-white/3 border border-white/5"
                        : config.bg,
                      isNearby && "ring-1 ring-white/20 shadow-lg"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Resolve toggle */}
                      <button
                        onClick={() => onMarkerResolve(marker.id, !marker.is_resolved)}
                        className="shrink-0 mt-0.5 transition-transform hover:scale-110"
                        aria-label={marker.is_resolved ? "Mark unresolved" : "Mark resolved"}
                      >
                        {marker.is_resolved
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <Circle className={cn("h-4 w-4", config.text)} />
                        }
                      </button>

                      {/* Marker content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wide", config.text)}>
                            {config.shortLabel}
                          </span>
                          {marker.confidence_score >= 0.88 && !marker.is_resolved && (
                            <span className="text-[9px] text-white/20">High confidence</span>
                          )}
                        </div>
                        {marker.explanation && (
                          <p className="text-[11px] text-white/45 leading-relaxed">
                            {marker.explanation}
                          </p>
                        )}
                      </div>

                      {/* Jump to timestamp */}
                      <button
                        onClick={() => onMarkerClick(marker.timestamp_seconds)}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white/35 hover:text-white/60 transition-colors font-mono"
                        title={`Jump to ${formatTime(marker.timestamp_seconds)}`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(marker.timestamp_seconds)}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* NOTES TAB */}
      {activeTab === "notes" && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          <p className="text-[10px] text-white/25 shrink-0">
            Review notes — pacing issues, re-record sections, CTA improvements
          </p>
          <textarea
            value={reviewNotes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="e.g. Hook feels weak — re-record opening 5s. Dead zone at 2:30 needs cutting. CTA at end is strong."
            className="flex-1 bg-white/5 border border-white/8 rounded-xl p-3 text-sm text-white/65 placeholder-white/15 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/40 leading-relaxed"
          />
          <button
            onClick={onNotesSave}
            className="w-full py-2.5 bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-sm font-medium rounded-xl transition-colors shrink-0"
          >
            Save Notes
          </button>
        </div>
      )}
    </div>
  );
}
