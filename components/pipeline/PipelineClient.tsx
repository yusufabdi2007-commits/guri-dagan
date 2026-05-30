"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Zap, Sparkles, Brain, Heart, TrendingUp, Hash, Users, Type,
  Upload, AlignLeft, Youtube, Copy, Check, Bookmark, RefreshCw,
  ChevronDown, ChevronUp, Play, Clock, BarChart2, AlertCircle,
  Flame, Layers, FileText, MessageSquare, Image, Video,
  ArrowRight, Loader2, X, CheckCircle2, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PipelineMode = "balanced" | "emotional" | "educational" | "quick" | "viral_push";

interface PipelineAnalysis {
  emotional_peak: string;
  core_message: string;
  audience_pain: string;
  content_type: string;
  estimated_length: string;
}

interface ClipSuggestion {
  title: string;
  description: string;
  start_cue: string;
  end_cue: string;
  estimated_duration: string;
  retention_score: number;
  emotional_impact: number;
  clip_type: string;
}

interface HookItem {
  hook: string;
  style?: string;
  trigger?: string;
  format?: string;
}

interface TitleItem {
  title: string;
  angle: string;
}

interface CTAItem {
  cta: string;
  goal: string;
}

interface HashtagSet {
  primary: string[];
  somali: string[];
  niche: string[];
  broad: string[];
}

interface CommunityPost {
  post: string;
  platform: string;
}

interface QuoteGraphic {
  quote: string;
  attribution: string;
}

interface ThumbnailText {
  text: string;
  style: string;
}

interface PipelineResult {
  analysis: PipelineAnalysis;
  clip_suggestions: ClipSuggestion[];
  tiktok_hooks: HookItem[];
  shorts_titles: TitleItem[];
  emotional_hooks: HookItem[];
  educational_hooks: HookItem[];
  cta_variations: CTAItem[];
  hashtags: HashtagSet;
  community_posts: CommunityPost[];
  quote_graphics: QuoteGraphic[];
  thumbnail_texts: ThumbnailText[];
  strategist_note: string;
}

// ─── Processing Stages ────────────────────────────────────────────────────────

const STAGES = [
  { id: "analyze", label: "Analyzing transcript", icon: FileText, color: "text-blue-500" },
  { id: "peaks", label: "Detecting emotional peaks", icon: Heart, color: "text-rose-500" },
  { id: "hooks", label: "Finding hook moments", icon: Zap, color: "text-amber-500" },
  { id: "platform", label: "Generating platform hooks", icon: TrendingUp, color: "text-emerald-500" },
  { id: "titles", label: "Building content titles", icon: Type, color: "text-violet-500" },
  { id: "ctas", label: "Creating CTAs & hashtags", icon: Hash, color: "text-sky-500" },
  { id: "community", label: "Crafting community assets", icon: Users, color: "text-indigo-500" },
  { id: "final", label: "Finalizing pipeline", icon: Sparkles, color: "text-primary" },
];

// ─── Mode Config ──────────────────────────────────────────────────────────────

const MODES: {
  id: PipelineMode;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  gradient: string;
}[] = [
  {
    id: "balanced",
    label: "Balanced",
    icon: Layers,
    description: "Standard mix",
    color: "text-primary",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    id: "emotional",
    label: "Emotional",
    icon: Heart,
    description: "Deep storytelling",
    color: "text-rose-500",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    id: "educational",
    label: "Educational",
    icon: Brain,
    description: "Authority-focused",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    id: "quick",
    label: "Quick",
    icon: Zap,
    description: "Fast & punchy",
    color: "text-amber-500",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    id: "viral_push",
    label: "Viral Push",
    icon: Flame,
    description: "Aggressive hooks",
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-orange-500/5",
  },
];

const CLIP_TYPE_LABELS: Record<string, string> = {
  hook_moment: "Hook Moment",
  story_peak: "Story Peak",
  key_insight: "Key Insight",
  cta_moment: "CTA Moment",
};

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── AssetCard ────────────────────────────────────────────────────────────────

function AssetCard({
  text,
  badge,
  badgeColor,
  onCopy,
  onSave,
  copied,
  saved,
}: {
  text: string;
  badge?: string;
  badgeColor?: string;
  onCopy: () => void;
  onSave: () => void;
  copied: boolean;
  saved: boolean;
}) {
  return (
    <div className="group bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-2xl p-4 transition-all duration-200">
      {badge && (
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2 block", badgeColor || "text-muted-foreground")}>
          {badge}
        </span>
      )}
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onCopy}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-all duration-200",
            copied
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-border/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={onSave}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-all duration-200",
            saved
              ? "bg-primary/15 text-primary"
              : "bg-border/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          {saved ? <CheckCircle2 className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
          {saved ? "Saved!" : "Save as Idea"}
        </button>
      </div>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  color,
  expanded,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", `${color}/10`)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      {expanded ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PipelineClient({ userId }: { userId: string }) {
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<PipelineMode>("balanced");
  const [emotionalIntensity, setEmotionalIntensity] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["clips", "tiktok", "shorts"])
  );
  const [strategistNote, setStrategistNote] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  // Load strategist hint from session cache
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("strategist_cache_normal");
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        const age = Date.now() - ts;
        if (age < 4 * 60 * 60 * 1000 && data?.today_move) {
          const modeHints: Record<string, string> = {
            emotional: "emotional",
            educational: "educational",
            batch: "quick",
          };
          const suggestedMode = modeHints[data.action_type] || null;
          if (suggestedMode) {
            setMode(suggestedMode as PipelineMode);
          }
          setStrategistNote(data.today_move);
        }
      }
    } catch {}
  }, []);

  // Stage cycling animation
  function startStages() {
    setCurrentStage(0);
    let i = 0;
    stageIntervalRef.current = setInterval(() => {
      i++;
      if (i < STAGES.length - 1) {
        setCurrentStage(i);
      }
    }, 650);
  }

  function stopStages() {
    if (stageIntervalRef.current) {
      clearInterval(stageIntervalRef.current);
      stageIntervalRef.current = null;
    }
    setCurrentStage(STAGES.length - 1);
  }

  const runPipeline = useCallback(
    async (transcriptText: string) => {
      setIsProcessing(true);
      setError(null);
      startStages();

      try {
        const res = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: transcriptText,
            title,
            mode,
            emotionalIntensity,
          }),
        });

        stopStages();

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Pipeline failed");
        }

        const data: PipelineResult = await res.json();
        setResult(data);
        setExpandedSections(new Set(["clips", "tiktok", "shorts"]));
      } catch (e: any) {
        setError(e.message || "Something went wrong. Please try again.");
        stopStages();
      } finally {
        setIsProcessing(false);
      }
    },
    [title, mode, emotionalIntensity]
  );

  async function handleFileUpload(file: File) {
    if (!file) return;

    const allowed = ["audio/", "video/", "audio/mpeg", "audio/wav", "audio/mp4", "video/mp4", "video/webm"];
    if (!allowed.some((t) => file.type.startsWith(t.split("/")[0]))) {
      setError("Please upload an audio or video file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File too large. Maximum 25MB. For longer recordings, extract audio first.");
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transcription failed");
      }

      const data = await res.json();
      const text = data.text || "";
      setTranscript(text);
      setInputMode("text");
      setIsTranscribing(false);

      // Auto-run pipeline
      await runPipeline(text);
    } catch (e: any) {
      setError(e.message || "Transcription failed.");
      setIsTranscribing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  async function handleSaveAsIdea(text: string, platform: string, key: string) {
    if (savedKeys.has(key)) return;
    try {
      await supabase.from("content_ideas").insert({
        user_id: userId,
        title: text.slice(0, 120),
        hook: text,
        platform: platform as any,
        category: "Engagement",
        status: "Idea",
        notes: `Generated by Pipeline — ${mode} mode`,
      });
      setSavedKeys((prev) => new Set([...prev, key]));
    } catch {}
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  }

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function reset() {
    setResult(null);
    setError(null);
    setCurrentStage(0);
    setCopiedKey(null);
    setSavedKeys(new Set());
  }

  const canRun = transcript.trim().length > 50 && !isProcessing;

  // ── Processing View ─────────────────────────────────────────────────────────

  if (isTranscribing || isProcessing) {
    const stageInfo = STAGES[currentStage];
    const StageIcon = stageInfo.icon;

    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-12"
          >
            {/* Central processing icon */}
            <div className="relative mb-8">
              <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center shadow-lg">
                <Zap className="h-9 w-9 text-white" />
              </div>
              <div className="absolute -inset-3 rounded-[28px] border-2 border-primary/20 animate-ping" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">
              {isTranscribing ? "Transcribing audio..." : "Pipeline running"}
            </h2>
            <p className="text-sm text-muted-foreground mb-10">
              {isTranscribing
                ? "Converting your recording to text with Whisper AI"
                : "AI is generating your full content suite"}
            </p>

            {/* Stages list */}
            <div className="w-full max-w-sm space-y-2">
              {STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isDone = i < currentStage;
                const isActive = i === currentStage;
                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300",
                      isActive
                        ? "bg-primary/8 border-primary/30"
                        : isDone
                        ? "bg-emerald-500/5 border-emerald-200/30"
                        : "bg-transparent border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                        isActive ? "bg-primary/15" : isDone ? "bg-emerald-500/15" : "bg-muted/30"
                      )}
                    >
                      {isDone ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : isActive ? (
                        <Loader2 className={cn("h-3.5 w-3.5 animate-spin", stage.color)} />
                      ) : (
                        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : isDone ? "text-emerald-600" : "text-muted-foreground/40"
                      )}
                    >
                      {stage.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Results View ────────────────────────────────────────────────────────────

  if (result) {
    const allHashtags = [
      ...result.hashtags.primary,
      ...result.hashtags.somali,
      ...result.hashtags.niche,
      ...result.hashtags.broad,
    ].join(" ");

    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

          {/* Success banner + controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pipeline complete</p>
                <p className="text-[10px] text-muted-foreground capitalize">{mode.replace("_", " ")} mode · {emotionalIntensity}% emotional intensity</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-2 rounded-xl transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          {/* Strategist note */}
          {result.strategist_note && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3.5"
            >
              <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">{result.strategist_note}</p>
            </motion.div>
          )}

          {/* Analysis card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-5 text-primary-foreground shadow-md"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.10)_0%,transparent_60%)]" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70 mb-3">
                Content Analysis
              </p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-primary-foreground/60 font-medium uppercase tracking-wide">Emotional Peak</p>
                  <p className="text-sm text-primary-foreground font-medium leading-snug mt-0.5">{result.analysis.emotional_peak}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/60 font-medium uppercase tracking-wide">Core Message</p>
                  <p className="text-sm text-primary-foreground/90 leading-snug mt-0.5">{result.analysis.core_message}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/60 font-medium uppercase tracking-wide">Audience Pain</p>
                  <p className="text-sm text-primary-foreground/90 leading-snug mt-0.5">{result.analysis.audience_pain}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[10px] font-semibold bg-white/15 text-primary-foreground px-2.5 py-1 rounded-full capitalize">
                  {result.analysis.content_type.replace("_", " ")}
                </span>
                <span className="text-[10px] font-semibold bg-white/15 text-primary-foreground px-2.5 py-1 rounded-full capitalize">
                  {result.analysis.estimated_length} content
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Clip Suggestions ── */}
          <SectionBlock
            id="clips"
            icon={Play}
            title="Clip Suggestions"
            count={result.clip_suggestions.length}
            color="text-emerald-500"
            expanded={expandedSections.has("clips")}
            onToggle={() => toggleSection("clips")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.clip_suggestions.map((clip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                        {CLIP_TYPE_LABELS[clip.clip_type] || clip.clip_type}
                      </span>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{clip.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{clip.description}</p>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      {clip.estimated_duration}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <BarChart2 className="h-3 w-3" /> Retention
                        </span>
                        <span className="text-[10px] font-bold text-foreground">{clip.retention_score}%</span>
                      </div>
                      <ScoreBar value={clip.retention_score} color="bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Heart className="h-3 w-3" /> Emotional Impact
                        </span>
                        <span className="text-[10px] font-bold text-foreground">{clip.emotional_impact}%</span>
                      </div>
                      <ScoreBar value={clip.emotional_impact} color="bg-rose-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">Start: </span>&ldquo;{clip.start_cue}...&rdquo;
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">End: </span>&ldquo;...{clip.end_cue}&rdquo;
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </SectionBlock>

          {/* ── TikTok Hooks ── */}
          <SectionBlock
            id="tiktok"
            icon={Video}
            title="TikTok Hooks"
            count={result.tiktok_hooks.length}
            color="text-pink-500"
            expanded={expandedSections.has("tiktok")}
            onToggle={() => toggleSection("tiktok")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.tiktok_hooks.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.hook}
                  badge={item.style?.replace("_", " ")}
                  badgeColor="text-pink-500"
                  onCopy={() => handleCopy(item.hook, `tiktok_${i}`)}
                  onSave={() => handleSaveAsIdea(item.hook, "TikTok", `tiktok_${i}`)}
                  copied={copiedKey === `tiktok_${i}`}
                  saved={savedKeys.has(`tiktok_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── Shorts Titles ── */}
          <SectionBlock
            id="shorts"
            icon={Youtube}
            title="YouTube Shorts Titles"
            count={result.shorts_titles.length}
            color="text-red-500"
            expanded={expandedSections.has("shorts")}
            onToggle={() => toggleSection("shorts")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.shorts_titles.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.title}
                  badge={item.angle}
                  badgeColor="text-red-500"
                  onCopy={() => handleCopy(item.title, `shorts_${i}`)}
                  onSave={() => handleSaveAsIdea(item.title, "YouTube", `shorts_${i}`)}
                  copied={copiedKey === `shorts_${i}`}
                  saved={savedKeys.has(`shorts_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── Emotional Hooks ── */}
          <SectionBlock
            id="emotional"
            icon={Heart}
            title="Emotional Hooks"
            count={result.emotional_hooks.length}
            color="text-rose-500"
            expanded={expandedSections.has("emotional")}
            onToggle={() => toggleSection("emotional")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.emotional_hooks.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.hook}
                  badge={item.trigger}
                  badgeColor="text-rose-500"
                  onCopy={() => handleCopy(item.hook, `emo_${i}`)}
                  onSave={() => handleSaveAsIdea(item.hook, "Instagram", `emo_${i}`)}
                  copied={copiedKey === `emo_${i}`}
                  saved={savedKeys.has(`emo_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── Educational Hooks ── */}
          <SectionBlock
            id="educational"
            icon={Brain}
            title="Educational Hooks"
            count={result.educational_hooks.length}
            color="text-blue-500"
            expanded={expandedSections.has("educational")}
            onToggle={() => toggleSection("educational")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.educational_hooks.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.hook}
                  badge={item.format?.replace("_", " ")}
                  badgeColor="text-blue-500"
                  onCopy={() => handleCopy(item.hook, `edu_${i}`)}
                  onSave={() => handleSaveAsIdea(item.hook, "YouTube", `edu_${i}`)}
                  copied={copiedKey === `edu_${i}`}
                  saved={savedKeys.has(`edu_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── CTAs ── */}
          <SectionBlock
            id="ctas"
            icon={ArrowRight}
            title="CTA Variations"
            count={result.cta_variations.length}
            color="text-amber-500"
            expanded={expandedSections.has("ctas")}
            onToggle={() => toggleSection("ctas")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.cta_variations.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.cta}
                  badge={`goal: ${item.goal}`}
                  badgeColor="text-amber-500"
                  onCopy={() => handleCopy(item.cta, `cta_${i}`)}
                  onSave={() => handleSaveAsIdea(item.cta, "All Platforms", `cta_${i}`)}
                  copied={copiedKey === `cta_${i}`}
                  saved={savedKeys.has(`cta_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── Hashtags ── */}
          <SectionBlock
            id="hashtags"
            icon={Hash}
            title="Hashtag Sets"
            count={4}
            color="text-sky-500"
            expanded={expandedSections.has("hashtags")}
            onToggle={() => toggleSection("hashtags")}
          >
            <div className="px-4 pb-4 space-y-4">
              {(
                [
                  { label: "Primary", tags: result.hashtags.primary, color: "bg-primary/10 text-primary" },
                  { label: "Somali", tags: result.hashtags.somali, color: "bg-emerald-500/10 text-emerald-600" },
                  { label: "Niche", tags: result.hashtags.niche, color: "bg-violet-500/10 text-violet-600" },
                  { label: "Broad", tags: result.hashtags.broad, color: "bg-sky-500/10 text-sky-600" },
                ] as const
              ).map(({ label, tags, color }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className={cn("text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer", color)}
                        onClick={() => handleCopy(tag, `tag_${label}_${i}`)}
                      >
                        {copiedKey === `tag_${label}_${i}` ? "✓" : tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => handleCopy(allHashtags, "all_hashtags")}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-2 rounded-xl transition-colors w-full justify-center mt-1"
              >
                {copiedKey === "all_hashtags" ? (
                  <><Check className="h-3.5 w-3.5 text-emerald-500" /> All copied!</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copy all hashtags</>
                )}
              </button>
            </div>
          </SectionBlock>

          {/* ── Community Posts ── */}
          <SectionBlock
            id="community"
            icon={MessageSquare}
            title="Community Posts"
            count={result.community_posts.length}
            color="text-indigo-500"
            expanded={expandedSections.has("community")}
            onToggle={() => toggleSection("community")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.community_posts.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.post}
                  badge={item.platform}
                  badgeColor="text-indigo-500"
                  onCopy={() => handleCopy(item.post, `community_${i}`)}
                  onSave={() => handleSaveAsIdea(item.post.slice(0, 120), "All Platforms", `community_${i}`)}
                  copied={copiedKey === `community_${i}`}
                  saved={savedKeys.has(`community_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── Quote Graphics ── */}
          <SectionBlock
            id="quotes"
            icon={Image}
            title="Quote Graphics"
            count={result.quote_graphics.length}
            color="text-violet-500"
            expanded={expandedSections.has("quotes")}
            onToggle={() => toggleSection("quotes")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.quote_graphics.map((item, i) => (
                <AssetCard
                  key={i}
                  text={`\u201c${item.quote}\u201d`}
                  badge="graphic text"
                  badgeColor="text-violet-500"
                  onCopy={() => handleCopy(`\u201c${item.quote}\u201d`, `quote_${i}`)}
                  onSave={() => handleSaveAsIdea(item.quote, "Instagram", `quote_${i}`)}
                  copied={copiedKey === `quote_${i}`}
                  saved={savedKeys.has(`quote_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* ── Thumbnail Texts ── */}
          <SectionBlock
            id="thumbnails"
            icon={FileText}
            title="Thumbnail Text"
            count={result.thumbnail_texts.length}
            color="text-orange-500"
            expanded={expandedSections.has("thumbnails")}
            onToggle={() => toggleSection("thumbnails")}
          >
            <div className="px-4 pb-4 space-y-3">
              {result.thumbnail_texts.map((item, i) => (
                <AssetCard
                  key={i}
                  text={item.text}
                  badge={item.style.replace("_", " ")}
                  badgeColor="text-orange-500"
                  onCopy={() => handleCopy(item.text, `thumb_${i}`)}
                  onSave={() => handleSaveAsIdea(item.text, "YouTube", `thumb_${i}`)}
                  copied={copiedKey === `thumb_${i}`}
                  saved={savedKeys.has(`thumb_${i}`)}
                />
              ))}
            </div>
          </SectionBlock>

          {/* Re-run with different mode */}
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Re-run with a different mode</p>
            <div className="flex flex-wrap gap-2">
              {MODES.filter((m) => m.id !== mode).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                      reset();
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50 transition-colors"
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── Input View ──────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">

        {/* Strategist hint banner */}
        {strategistNote && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3.5"
          >
            <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-0.5">Strategist Recommends</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{strategistNote}</p>
            </div>
            <button onClick={() => setStrategistNote(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* Input tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setInputMode("text")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium border transition-all",
              inputMode === "text"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <AlignLeft className="h-3.5 w-3.5" />
            Paste Text
          </button>
          <button
            onClick={() => setInputMode("file")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium border transition-all",
              inputMode === "file"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Audio/Video
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium border border-dashed border-border text-muted-foreground/50 bg-muted/20 cursor-not-allowed"
            title="Coming soon"
          >
            <Youtube className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">YouTube URL</span>
            <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
          </button>
        </div>

        {/* Text input */}
        <AnimatePresence mode="wait">
          {inputMode === "text" && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Video title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
              <textarea
                placeholder="Paste your transcript or script here...&#10;&#10;The more text you provide, the better the pipeline output. Minimum 50 characters."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none leading-relaxed"
              />
              {transcript.length > 0 && transcript.length < 50 && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Add more text for better results ({50 - transcript.length} more characters needed)
                </p>
              )}
            </motion.div>
          )}

          {inputMode === "file" && (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Drop audio or video here</p>
                <p className="text-xs text-muted-foreground">MP3, MP4, WAV, M4A, WebM · max 25MB</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Audio will be transcribed automatically, then the pipeline runs
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode selector */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Processing Mode</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-medium whitespace-nowrap transition-all duration-200 border shrink-0 min-w-[80px]",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Emotional intensity slider */}
        {(mode === "emotional" || mode === "balanced") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emotional Intensity</p>
              <span className="text-xs font-bold text-foreground">
                {emotionalIntensity < 33 ? "Calm & Educational" : emotionalIntensity < 66 ? "Warm & Relatable" : "Deeply Personal"}
                <span className="text-muted-foreground font-normal ml-1">({emotionalIntensity})</span>
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={100}
                value={emotionalIntensity}
                onChange={(e) => setEmotionalIntensity(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-gradient-to-r from-blue-400 via-rose-400 to-red-500"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">Calm</span>
                <span className="text-[10px] text-muted-foreground">Warm</span>
                <span className="text-[10px] text-muted-foreground">Intense</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3.5">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={() => runPipeline(transcript)}
          disabled={!canRun}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 shadow-sm",
            canRun
              ? "gradient-primary text-white hover:opacity-90 active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Zap className="h-4 w-4" />
          Run Pipeline
          {transcript.length > 50 && (
            <span className="text-xs opacity-70 font-normal">
              · {mode.replace("_", " ")} mode
            </span>
          )}
        </button>

        {/* What you'll get */}
        <div className="bg-muted/20 border border-border/40 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            What the pipeline generates
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              "3 TikTok hooks",
              "3 Shorts titles",
              "3 Emotional hooks",
              "3 Educational hooks",
              "3 CTA variations",
              "Full hashtag set",
              "2 Community posts",
              "3 Quote graphics",
              "3 Thumbnail texts",
              "3 Clip suggestions",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── SectionBlock wrapper ─────────────────────────────────────────────────────

function SectionBlock({
  id,
  icon,
  title,
  count,
  color,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-2xl overflow-hidden"
    >
      <SectionHeader
        icon={icon}
        title={title}
        count={count}
        color={color}
        expanded={expanded}
        onToggle={onToggle}
      />
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
