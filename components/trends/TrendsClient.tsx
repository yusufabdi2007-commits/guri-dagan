"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Sparkles, Loader2, Plus, Copy, CheckCheck,
  Heart, HelpCircle, Zap, Lightbulb, AlertCircle
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "teenagers", label: "Teenagers", emoji: "🧑‍🎓", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: "discipline", label: "Discipline", emoji: "⚖️", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { id: "communication", label: "Communication", emoji: "💬", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { id: "emotional regulation", label: "Emotional Reg.", emoji: "🧠", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { id: "Islamic parenting", label: "Islamic Parenting", emoji: "🌙", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  { id: "mother burnout", label: "Mother Burnout", emoji: "💔", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { id: "father involvement", label: "Father Role", emoji: "👨‍👦", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { id: "screen time", label: "Screen Time", emoji: "📱", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { id: "early childhood", label: "Early Childhood", emoji: "🌱", color: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" },
  { id: "family peace", label: "Family Peace", emoji: "🕊️", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
];

interface TrendData {
  pain_points: string[];
  content_ideas: string[];
  emotional_triggers: string[];
  questions: string[];
  hook_starters: string[];
}

export function TrendsClient() {
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCategory(cat: string) {
    setSelected(cat);
    setData(null);
    setLoading(true);

    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      toast({ title: "Failed to load topics. Check your OpenAI key.", variant: "destructive" as never });
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!" });
  }

  const catObj = CATEGORIES.find(c => c.id === selected);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header card */}
      <Card className="gradient-primary border-0 shadow-lg">
        <CardContent className="p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-6 w-6" />
            <div>
              <p className="font-bold text-sm">Somali Parent Pain Points</p>
              <p className="text-xs opacity-80">Tap a category to discover content ideas</p>
            </div>
          </div>
          <p className="text-xs opacity-70 italic">
            &ldquo;Content that resonates starts with understanding your audience&apos;s real struggles.&rdquo;
          </p>
        </CardContent>
      </Card>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategory(cat.id)}
            className={cn(
              "flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-95",
              selected === cat.id
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
            )}
          >
            <span className="text-xl">{cat.emoji}</span>
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-lg", cat.color)}>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <Card className="border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse-soft">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-medium text-foreground">Analyzing Somali parenting pain points...</p>
            <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto mt-3" />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && catObj && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{catObj.emoji}</span>
            <h2 className="font-bold text-foreground">{catObj.label}</h2>
          </div>

          {/* Pain points */}
          <Section title="Pain Points" icon={<AlertCircle className="h-4 w-4 text-red-500" />} color="red">
            {data.pain_points.map((p, i) => (
              <ItemRow key={i} text={p} onCopy={() => copy(p, `pp-${i}`)} copied={copied === `pp-${i}`} index={i + 1} />
            ))}
          </Section>

          {/* Content ideas */}
          <Section title="Video Ideas" icon={<Lightbulb className="h-4 w-4 text-yellow-500" />} color="yellow">
            {data.content_ideas.map((p, i) => (
              <ItemRow key={i} text={p} onCopy={() => copy(p, `ci-${i}`)} copied={copied === `ci-${i}`} index={i + 1} />
            ))}
          </Section>

          {/* Hook starters */}
          <Section title="Hook Starters" icon={<Zap className="h-4 w-4 text-primary" />} color="purple">
            {data.hook_starters.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl group border border-primary/10">
                <p className="text-sm text-foreground flex-1 italic leading-relaxed">&ldquo;{p}&rdquo;</p>
                <button onClick={() => copy(p, `hs-${i}`)} className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
                  {copied === `hs-${i}` ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </Section>

          {/* Emotional triggers */}
          <Section title="Emotional Triggers" icon={<Heart className="h-4 w-4 text-pink-500" />} color="pink">
            <div className="flex flex-wrap gap-2">
              {data.emotional_triggers.map((t, i) => (
                <button key={i} onClick={() => copy(t, `et-${i}`)} className="text-xs bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 px-3 py-1.5 rounded-xl font-medium hover:opacity-80 transition-opacity">
                  {t}
                </button>
              ))}
            </div>
          </Section>

          {/* Questions */}
          <Section title="Questions Parents Ask" icon={<HelpCircle className="h-4 w-4 text-blue-500" />} color="blue">
            {data.questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl group">
                <span className="text-blue-500 font-bold text-sm shrink-0">Q{i + 1}</span>
                <p className="text-sm text-foreground flex-1 leading-relaxed">{q}</p>
                <button onClick={() => copy(q, `q-${i}`)} className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
                  {copied === `q-${i}` ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function ItemRow({ text, onCopy, copied, index }: { text: string; onCopy: () => void; copied: boolean; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl group">
      <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">{index}.</span>
      <p className="text-sm text-foreground flex-1 leading-relaxed">{text}</p>
      <button onClick={onCopy} className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
        {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}
