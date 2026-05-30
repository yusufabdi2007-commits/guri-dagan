"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Loader2, Copy, CheckCheck, RefreshCw, Heart, Eye, TrendingUp, Lightbulb, Target } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ScoreResult {
  emotional_score: number;
  curiosity_score: number;
  retention_score: number;
  clarity_score: number;
  virality_score: number;
  overall_score: number;
  verdict: "Weak" | "Good" | "Strong" | "Viral";
  main_weakness: string;
  rewrites: string[];
  emotional_alternatives: string[];
  audience_specific_tips: string[];
}

const VERDICT_CONFIG = {
  Weak:   { color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",        bar: "#ef4444" },
  Good:   { color: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30", bar: "#f59e0b" },
  Strong: { color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",    bar: "#3b82f6" },
  Viral:  { color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30", bar: "#10b981" },
};

const EXAMPLE_HOOKS = [
  "Your child is not the problem. You are.",
  "The one thing every Somali parent does wrong at bedtime",
  "Why your teenager stopped talking to you (and how to fix it)",
  "I learned this parenting secret too late. Don't make my mistake.",
];

function ScoreRow({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-bold" style={{ color }}>{value}<span className="text-muted-foreground font-normal">/100</span></span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export function HookScorerClient() {
  const [hook, setHook] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleScore() {
    if (!hook.trim()) {
      toast({ title: "Enter a hook to score", variant: "destructive" as never });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/score-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Scoring failed. Check your OpenAI key.", variant: "destructive" as never });
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    setHook(text);
    setResult(null);
    toast({ title: "Copied & loaded for re-score!" });
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Score Your Hook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your hook or video title here..."
            value={hook}
            onChange={e => setHook(e.target.value)}
            rows={3}
            className="text-base"
          />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_HOOKS.map(ex => (
                <button key={ex} onClick={() => { setHook(ex); setResult(null); }}
                  className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all text-left">
                  {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleScore} disabled={loading || !hook.trim()}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scoring...</> : <><Zap className="h-4 w-4 mr-2" />Score This Hook</>}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Overall score */}
          <Card className={cn("border-2", result.verdict === "Viral" ? "border-green-400" : result.verdict === "Strong" ? "border-blue-400" : result.verdict === "Good" ? "border-yellow-400" : "border-red-400")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-5xl font-black text-foreground">{result.overall_score}</div>
                  <div className="text-sm text-muted-foreground">/ 100</div>
                </div>
                <div className="text-right">
                  <span className={cn("text-sm font-bold px-3 py-1 rounded-xl", VERDICT_CONFIG[result.verdict].color)}>
                    {result.verdict}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[160px] text-right">{result.main_weakness}</p>
                </div>
              </div>

              <div className="space-y-3">
                <ScoreRow icon={Heart}     label="Emotional"   value={result.emotional_score}  color="#ec4899" />
                <ScoreRow icon={Eye}       label="Curiosity"   value={result.curiosity_score}   color="#8b5cf6" />
                <ScoreRow icon={TrendingUp} label="Retention"  value={result.retention_score}   color="#7c3aed" />
                <ScoreRow icon={Lightbulb} label="Clarity"     value={result.clarity_score}     color="#3b82f6" />
                <ScoreRow icon={Target}    label="Virality"    value={result.virality_score}    color="#10b981" />
              </div>
            </CardContent>
          </Card>

          {/* Rewrites */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Stronger Rewrites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.rewrites.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl group">
                  <span className="text-xs font-bold text-primary mt-0.5 shrink-0">#{i + 1}</span>
                  <p className="text-sm text-foreground flex-1 leading-relaxed">{r}</p>
                  <button onClick={() => copy(r, `rw-${i}`)} className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
                    {copied === `rw-${i}` ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Emotional alternatives */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                High-Emotion Versions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.emotional_alternatives.map((alt, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-pink-50/50 dark:bg-pink-950/10 rounded-xl border border-pink-100 dark:border-pink-900/30 group">
                  <p className="text-sm text-foreground flex-1 leading-relaxed">{alt}</p>
                  <button onClick={() => copy(alt, `alt-${i}`)} className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
                    {copied === `alt-${i}` ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Somali parent tips */}
          <Card className="bg-accent/30 border-accent/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Somali Audience Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.audience_specific_tips.map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-primary font-bold text-sm shrink-0">{i + 1}.</span>
                  <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
