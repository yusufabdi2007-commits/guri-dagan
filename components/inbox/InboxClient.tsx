"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  MessageSquare, Sparkles, CheckCircle2, ChevronDown,
  Youtube, Video, Loader2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  source: string;
  created_at: string;
  converted: boolean;
  idea_id: string | null;
}

interface Props {
  questions: Question[];
  userId: string;
}

const SOURCES = [
  { value: "tiktok_comment", label: "TikTok Comment" },
  { value: "youtube_comment", label: "YouTube Comment" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "coaching", label: "Coaching Session" },
  { value: "faq", label: "FAQ / DM" },
  { value: "other", label: "Other" },
];

const SOURCE_LABELS: Record<string, string> = {
  tiktok_comment: "TikTok",
  youtube_comment: "YouTube",
  whatsapp: "WhatsApp",
  coaching: "Coaching",
  faq: "FAQ",
  other: "Other",
};

export function InboxClient({ questions: initialQuestions, userId }: Props) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [newQ, setNewQ] = useState("");
  const [source, setSource] = useState("tiktok_comment");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const router = useRouter();

  async function handleAdd() {
    if (!newQ.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("question_inbox")
      .insert({ user_id: userId, question: newQ.trim(), source })
      .select()
      .single();

    if (error) {
      toast({ title: "Could not save question", variant: "destructive" });
    } else {
      setQuestions(prev => [data, ...prev]);
      setNewQ("");
      toast({ title: "Question saved!", variant: "success" });
    }
    setSaving(false);
  }

  async function handleConvert(q: Question) {
    if (converting) return;
    setConverting(q.id);

    try {
      const res = await fetch("/api/inbox-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.question, source: q.source }),
      });
      const idea = await res.json();

      if (!res.ok) {
        toast({ title: idea.error || "Failed to generate idea", variant: "destructive" });
        return;
      }

      const supabase = createClient();
      const { data: saved, error: ideaError } = await supabase
        .from("content_ideas")
        .insert({
          user_id: userId,
          title: idea.title,
          hook: idea.hook,
          platform: idea.platform,
          category: idea.category,
          status: "Idea",
          notes: `From ${SOURCE_LABELS[q.source] || q.source} question: "${q.question}"`,
        })
        .select("id")
        .single();

      if (ideaError) {
        toast({ title: "Could not save idea", variant: "destructive" });
        return;
      }

      await supabase
        .from("question_inbox")
        .update({ converted: true, idea_id: saved.id })
        .eq("id", q.id);

      setQuestions(prev =>
        prev.map(item => item.id === q.id ? { ...item, converted: true, idea_id: saved.id } : item)
      );

      toast({
        title: "Idea created from question!",
        description: idea.title,
        variant: "success",
      });
    } catch {
      toast({ title: "Network error. Try again.", variant: "destructive" });
    } finally {
      setConverting(null);
    }
  }

  const pending = questions.filter(q => !q.converted);
  const done = questions.filter(q => q.converted);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Add question */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Log a question</p>
          <textarea
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
            placeholder="Paste a question from TikTok, YouTube, WhatsApp..."
            className="w-full text-sm bg-muted/50 border border-border rounded-xl px-3 py-2.5 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full appearance-none text-xs bg-muted/50 border border-border rounded-xl px-3 py-2.5 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              >
                {SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newQ.trim() || saving}
              className="h-9 px-4 text-xs rounded-xl"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Save</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending questions */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Pending — {pending.length}
          </p>
          {pending.map(q => (
            <Card key={q.id} className="border border-border/60">
              <CardContent className="p-3">
                <div className="flex items-start gap-2 mb-2.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed flex-1">{q.question}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {SOURCE_LABELS[q.source] || q.source}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConvert(q)}
                    disabled={!!converting}
                    className="h-7 text-xs rounded-xl gap-1.5"
                  >
                    {converting === q.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {converting === q.id ? "Generating..." : "Convert to Idea"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Converted */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Converted — {done.length}
          </p>
          {done.map(q => (
            <div
              key={q.id}
              className="flex items-start gap-2.5 p-3 rounded-2xl bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-2">{q.question}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No questions yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Log questions from your TikTok comments, YouTube, or WhatsApp. AI turns them into video ideas.
          </p>
        </div>
      )}
    </div>
  );
}
