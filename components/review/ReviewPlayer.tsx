"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewMarker } from "./ReviewClient";

const MARKER_BAR_COLORS: Record<string, string> = {
  "Hook": "bg-violet-500",
  "Emotional Peak": "bg-rose-500",
  "Dead Zone": "bg-red-500",
  "Silence Gap": "bg-zinc-400",
  "Replay-Worthy": "bg-cyan-400",
  "Retention Opportunity": "bg-amber-400",
  "Strong CTA": "bg-emerald-400",
};

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  const id = match ? match[1] : "";
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&color=white`;
}

interface ReviewPlayerProps {
  url: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  seekRef: React.MutableRefObject<(time: number) => void>;
  markers: ReviewMarker[];
  duration: number;
}

export function ReviewPlayer({
  url,
  onTimeUpdate,
  onDurationChange,
  seekRef,
  markers,
  duration: externalDuration,
}: ReviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [internalDuration, setInternalDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const displayDuration = externalDuration || internalDuration;
  const progress = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;
  const isYouTube = url && isYouTubeUrl(url);

  // Register seekRef for external seek control
  useEffect(() => {
    seekRef.current = (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
        onTimeUpdate(time);
      }
    };
  }, [seekRef, onTimeUpdate]);

  function handlePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    onTimeUpdate(t);
  }

  function handleDurationChange() {
    if (!videoRef.current) return;
    const d = videoRef.current.duration;
    if (d && isFinite(d)) {
      setInternalDuration(d);
      onDurationChange(d);
    }
  }

  function handleSpeedChange(s: number) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

  function handleSkip(delta: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(displayDuration, videoRef.current.currentTime + delta));
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current || !videoRef.current || !displayDuration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * displayDuration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onTimeUpdate(newTime);
  }

  // No URL state
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-[320px] aspect-[9/16] bg-white/3 rounded-2xl border border-white/8 text-center p-8">
        <div className="text-5xl mb-4 opacity-30">📹</div>
        <p className="text-white/30 text-sm font-medium">No video URL</p>
        <p className="text-white/20 text-xs mt-1.5 leading-relaxed">
          Add a video URL in the Videos tracker to enable playback here
        </p>
      </div>
    );
  }

  // YouTube embed — no custom controls possible without full IFrame API
  if (isYouTube) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        <div className="relative w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
          <iframe
            src={getYouTubeEmbedUrl(url)}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Review player"
          />
        </div>
        <p className="text-center text-[10px] text-white/20">
          YouTube — use sidebar markers to jump to timestamps
        </p>
      </div>
    );
  }

  // HTML5 video with full custom controls
  return (
    <div className="flex flex-col gap-3 w-full max-w-[320px]">
      {/* Video container */}
      <div className="relative w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl group">
        <video
          ref={videoRef}
          src={url}
          className="absolute inset-0 w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => { setIsPlaying(true); setVideoError(null); }}
          onPause={() => setIsPlaying(false)}
          onError={() => setVideoError("Video could not be loaded. Check the URL or file path.")}
          muted={muted}
          playsInline
        />
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-6">
            <div className="text-3xl mb-3 opacity-40">⚠</div>
            <p className="text-white/60 text-xs leading-relaxed max-w-[200px]">{videoError}</p>
            <button
              onClick={() => { setVideoError(null); videoRef.current?.load(); }}
              className="mt-4 px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Click-to-play overlay */}
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <div className="w-14 h-14 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
            {isPlaying
              ? <Pause className="h-5 w-5 text-white" />
              : <Play className="h-5 w-5 text-white ml-0.5" />
            }
          </div>
        </button>
      </div>

      {/* Controls panel */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-3 space-y-3">

        {/* Progress bar with marker dots */}
        <div
          ref={progressRef}
          className="relative h-2 bg-white/10 rounded-full cursor-pointer group/prog"
          onClick={handleProgressClick}
        >
          {/* Fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-white/60 rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />

          {/* Marker dots — clickable, colored by type */}
          {displayDuration > 0 && markers.map(marker => (
            <button
              key={marker.id}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 rounded-full transition-transform hover:scale-150 focus:outline-none",
                MARKER_BAR_COLORS[marker.marker_type] ?? "bg-white/60",
                marker.is_resolved && "opacity-25"
              )}
              style={{ left: `calc(${(marker.timestamp_seconds / displayDuration) * 100}% - 3px)` }}
              onClick={(e) => {
                e.stopPropagation();
                seekRef.current(marker.timestamp_seconds);
              }}
              title={`${marker.marker_type} — ${formatTime(marker.timestamp_seconds)}`}
            />
          ))}

          {/* Scrubber thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md -translate-x-1/2 pointer-events-none opacity-0 group-hover/prog:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-[10px] text-white/30 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>

        {/* Playback controls row */}
        <div className="flex items-center justify-between">
          {/* Skip + play */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSkip(-10)}
              className="p-2 rounded-xl hover:bg-white/8 text-white/40 hover:text-white transition-colors"
              title="Back 10s"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handlePlay}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-colors shadow-lg"
            >
              {isPlaying
                ? <Pause className="h-4 w-4 text-black" />
                : <Play className="h-4 w-4 text-black ml-0.5" />
              }
            </button>
            <button
              onClick={() => handleSkip(10)}
              className="p-2 rounded-xl hover:bg-white/8 text-white/40 hover:text-white transition-colors"
              title="Forward 10s"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Speed + mute */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMuted(!muted)}
              className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <div className="flex items-center gap-0.5">
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "px-1.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
                    speed === s
                      ? "bg-white/15 text-white"
                      : "text-white/25 hover:text-white/50 hover:bg-white/5"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Marker color legend */}
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {Object.entries(MARKER_BAR_COLORS).filter(([type]) =>
            markers.some(m => m.marker_type === type)
          ).map(([type, colorClass]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", colorClass)} />
              <span className="text-[9px] text-white/25">{type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
