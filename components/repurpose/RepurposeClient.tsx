"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Layers, Sparkles, Copy, CheckCheck, Loader2, Heart, BookOpen, Zap } from "lucide-react";

type RepurposeMode = "balanced" | "emotional" | "educational" | "quick";
type EmotionalIntensity = "low" | "medium" | "high";

const MODES: { key: RepurposeMode; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "balanced", label: "Balanced", desc: "Mix of everything", icon: Layers },
  { key: "emotional", label: "Emotional", desc: "Story-driven", icon: Heart },
  { key: "educational", label: "Educational", desc: "Tips & how-to", icon: BookOpen },
  { key: "quick", label: "Quick", desc: "Short & punchy", icon: Zap },
];

// Asset type → label + color
const ASSET_META: Record<string, { label: string; color: string; icon: string }> = {
  tiktok_hook:         { label: "TikTok Hook",         color: "bg-black text-white",                    icon: "🎵" },
  youtube_shorts_title:{ label: "YouTube Title",       color: "bg-red-500 text-white",                  icon: "▶️" },
  instagram_caption:   { label: "Instagram Caption",   color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white", icon: "📸" },
  cta_variation:       { label: "Call to Action",      color: "bg-blue-500 text-white",                 icon: "📣" },
  quote_graphic:       { label: "Quote Graphic",       color: "bg-amber-500 text-white",                icon: "✨" },
  community_post:      { label: "Community Post",      color: "bg-green-600 text-white",                icon: "👥" },
  hashtag_set:         { label: "Hashtags",            color: "bg-gray-700 text-white",                 icon: "#" },
};

interface Asset {
  type: string;
  platform: string;
  content: string;
}

interface Analysis {
  emotional_peak: string;
  core_message: string;
  audience_pain: string;
}

interface RepurposeResult {
  analysis: Analysis;
  assets: Asset[];
}

interface HistoryItem {
  id: string;
  source_title: string | null;
  asset_count: number;
  created_at: string;
  assets: Asset[];
}

interface Props {
  history: HistoryItem[];
  userId: string;
}

export function RepurposeClient({ history: initialHistory, userId }: Props) {
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RepurposeResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [filterType, setFilterType] = useState<string>("all");
  const [mode, setMode] = useState<RepurposeMode>("balanced");
  const [emotionalIntensity, setEmotionalIntensity] = useState<EmotionalIntensity>("medium");

  async function handleRepurpose() {
    if (!transcript.trim()) {
      toast({ title: "Paste your transcript first", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, title, mode, emotionalIntensity }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Repurposing failed. Check your OpenAI API key.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function saveToLibrary() {
    if (!result) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("repurposed_assets")
        .insert({
          user_id: userId,
          source_title: title || null,
          source_transcript: transcript,
          assets: result.assets,
          asset_count: result.assets.length,
        })
        .select()
        .single();

      if (error) throw error;
      setHistory(prev => [{ ...data, assets: result.assets }, ...prev]);
      toast({ title: "Saved to library!", description: `${result.assets.length} assets saved`, variant: "success" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!" });
  }

  const filteredAssets = result?.assets.filter(a =>
    filterType === "all" || a.type === filterType
  ) ?? [];

  const assetTypes = result ? [...new Set(result.assets.map(a => a.type))] : [];

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Tab bar */}
      <div className="flex gap-2 bg-muted/50 rounded-2xl p-1">
        {[
          { key: "create", label: "Create Assets" },
          { key: "history", label: `Library (${history.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "create" | "history")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "create" && (
        <>
          {/* Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-primary" />
                Content Repurposing Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Video Title (optional)</Label>
                <Input
                  placeholder="e.g. How to calm a crying toddler at night"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Transcript or Script *</Label>
                <Textarea
                  placeholder="Paste your video transcript or script here. The AI will extract all the key moments and generate multiple platform-specific assets..."
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{transcript.length} characters — up to 4000 used for analysis</p>
              </div>

              {/* Mode selector */}
              <div className="space-y-2">
                <Label>Repurposing Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map(({ key, label, desc, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        mode === key
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">{label}</div>
                        <div className="text-[10px] opacity-70">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotional intensity (only shown in emotional mode) */}
              {mode === "emotional" && (
                <div className="space-y-2">
                  <Label>Emotional Intensity</Label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as EmotionalIntensity[]).map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEmotionalIntensity(level)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                          emotionalIntensity === level
                            ? "bg-pink-500 border-pink-500 text-white"
                            : "border-border text-muted-foreground hover:border-pink-300"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleRepurpose} disabled={loading} className="w-full h-12" size="lg">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating assets...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate {">"}5 Content Assets</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading */}
          {loading && (
            <Card className="border-primary/30">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center animate-pulse-soft">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium">Analyzing transcript and building assets...</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>TikTok hooks</span>•<span>Titles</span>•<span>Captions</span>•<span>Quotes</span>•<span>CTAs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Analysis */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">AI Analysis</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Emotional Peak</p>
                      <p className="text-sm text-foreground">{result.analysis.emotional_peak}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Core Message</p>
                      <p className="text-sm text-foreground">{result.analysis.core_message}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Audience Pain Point</p>
                      <p className="text-sm text-foreground">{result.analysis.audience_pain}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{result.assets.length} assets generated</p>
                <Button onClick={saveToLibrary} disabled={saving} variant="outline" size="sm" className="gap-2">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {saving ? "Saving..." : "Save to Library"}
                </Button>
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  All ({result.assets.length})
                </button>
                {assetTypes.map(type => {
                  const meta = ASSET_META[type];
                  const count = result.assets.filter(a => a.type === type).length;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                        filterType === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {meta?.icon} {meta?.label ?? type} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Asset cards */}
              <div className="space-y-3">
                {filteredAssets.map((asset, i) => {
                  const meta = ASSET_META[asset.type];
                  const key = `asset-${i}`;
                  return (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-xl ${meta?.color ?? "bg-muted text-muted-foreground"}`}>
                              {meta?.icon} {meta?.label ?? asset.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{asset.platform}</span>
                          </div>
                          <button
                            onClick={() => copyText(asset.content, key)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                          >
                            {copied === key
                              ? <CheckCheck className="h-4 w-4 text-green-500" />
                              : <Copy className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{asset.content}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground">No saved assets yet</p>
              <p className="text-xs text-muted-foreground mt-1">Repurpose a video and save to build your library</p>
            </div>
          ) : (
            history.map(item => (
              <Card key={item.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-foreground line-clamp-1">
                        {item.source_title || "Untitled video"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.asset_count} assets · {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {item.assets && item.assets.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {item.assets.slice(0, 2).map((asset, ai) => {
                        const meta = ASSET_META[asset.type];
                        return (
                          <div key={ai} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="font-medium shrink-0">{meta?.icon} {meta?.label}:</span>
                            <span className="line-clamp-1 flex-1">{asset.content}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
