"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Mic2, Sparkles, Copy, CheckCheck, RefreshCw,
  Loader2, Clock, Zap, Heart, TrendingUp, ChevronRight,
  FileAudio, History
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Suggestion {
  title: string;
  hook: string;
  start_time: number;
  end_time: number;
  caption: string;
  emotional_score: number;
  retention_score: number;
  why: string;
}

interface Props {
  history: { id: string; source_filename: string; created_at: string; suggestions: unknown }[];
  userId: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export function TranscriptClient({ history, userId }: Props) {
  const [tab, setTab] = useState<"upload" | "history">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [step, setStep] = useState<"idle" | "transcribing" | "analyzing" | "done">("idle");
  const [copied, setCopied] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(f: File) {
    setFile(f);
    setSuggestions([]);
    setTranscript("");
    setStep("idle");
  }

  async function handleTranscribe() {
    if (!file) return;
    setStep("transcribing");
    setSuggestions([]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transcription failed");
      }
      const data = await res.json();
      setTranscript(data.text);
      setStep("analyzing");

      // Generate shorts
      const res2 = await fetch("/api/shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: data.text, filename: file.name }),
      });
      if (!res2.ok) throw new Error("Analysis failed");
      const data2 = await res2.json();
      setSuggestions(data2.suggestions || []);
      setStep("done");

      // Save to DB
      const supabase = createClient();
      await supabase.from("shorts_suggestions").insert({
        user_id: userId,
        source_filename: file.name,
        transcript: data.text,
        suggestions: data2.suggestions || [],
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: msg, variant: "destructive" as never });
      setStep("idle");
    }
  }

  async function handleRegenerate() {
    if (!transcript) return;
    setStep("analyzing");
    setSuggestions([]);

    const res = await fetch("/api/shorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, filename: file?.name || "unknown" }),
    });
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setStep("done");
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!" });
  }

  function exportAll() {
    const text = suggestions.map((s, i) =>
      `CLIP ${i + 1}: ${s.title}\n` +
      `Timestamps: ${formatTime(s.start_time)} – ${formatTime(s.end_time)}\n` +
      `Hook: ${s.hook}\n` +
      `Caption:\n${s.caption}\n` +
      `Emotional Score: ${s.emotional_score}/100 | Retention: ${s.retention_score}/100\n` +
      `Why it works: ${s.why}\n`
    ).join("\n" + "─".repeat(50) + "\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shorts-suggestions-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <Tabs value={tab} onValueChange={v => setTab(v as "upload" | "history")}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="upload"><Mic2 className="h-4 w-4 mr-1.5" />Generate</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" />History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {/* Upload zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
              file ? "border-green-500 bg-green-50/30 dark:bg-green-950/10" : ""
            )}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/mov,video/quicktime,video/webm,video/mkv,audio/mp3,audio/wav,audio/m4a,audio/mp4"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                  <FileAudio className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-semibold text-sm text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB — tap to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Upload video or audio</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, MKV, MP3, M4A — max 25MB</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">For longer videos, upload audio track only</p>
                </div>
              </div>
            )}
          </div>

          {file && step === "idle" && (
            <Button className="w-full h-12" onClick={handleTranscribe}>
              <Sparkles className="h-4 w-4 mr-2" />
              Transcribe & Generate Shorts
            </Button>
          )}

          {/* Progress states */}
          {(step === "transcribing" || step === "analyzing") && (
            <Card className="border-primary/30">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse-soft">
                  {step === "transcribing" ? <Mic2 className="h-7 w-7 text-white" /> : <Sparkles className="h-7 w-7 text-white" />}
                </div>
                <p className="font-semibold text-sm text-foreground">
                  {step === "transcribing" ? "Transcribing with Whisper AI..." : "Detecting emotional moments..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {step === "transcribing" ? "Converting speech to text" : "Finding the best clips for Somali parents"}
                </p>
                <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto mt-3" />
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {step === "done" && suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{suggestions.length} clip suggestions</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRegenerate}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Regenerate
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAll}>
                    Export All
                  </Button>
                </div>
              </div>

              {suggestions.map((s, i) => (
                <Card key={i} className="overflow-hidden card-hover">
                  {/* Score header */}
                  <div className="gradient-primary px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">Clip {i + 1}</span>
                      <span className="text-white/70 text-xs">{formatTime(s.start_time)} → {formatTime(s.end_time)}</span>
                    </div>
                    <div className="flex gap-3 text-white/90 text-xs">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{s.emotional_score}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{s.retention_score}</span>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">&ldquo;{s.why}&rdquo;</p>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Emotional</span><span>{s.emotional_score}%</span>
                        </div>
                        <ScoreBar value={s.emotional_score} color="#ec4899" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Retention</span><span>{s.retention_score}%</span>
                        </div>
                        <ScoreBar value={s.retention_score} color="#7c3aed" />
                      </div>
                    </div>

                    {/* Hook */}
                    <div className="bg-muted/40 rounded-xl p-3 relative group">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Hook</p>
                      <p className="text-sm text-foreground leading-relaxed pr-8">{s.hook}</p>
                      <button onClick={() => copyText(s.hook, `hook-${i}`)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
                        {copied === `hook-${i}` ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>

                    {/* Caption */}
                    <div className="bg-muted/40 rounded-xl p-3 relative group">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Caption</p>
                      <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans pr-8">{s.caption}</pre>
                      <button onClick={() => copyText(s.caption, `caption-${i}`)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all">
                        {copied === `caption-${i}` ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => copyText(`${s.hook}\n\n${s.caption}`, `all-${i}`)}>
                        {copied === `all-${i}` ? <><CheckCheck className="h-3.5 w-3.5 mr-1 text-green-500" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copy All</>}
                      </Button>
                      <Button size="sm" className="flex-1 text-xs" onClick={() => copyText(`${formatTime(s.start_time)} - ${formatTime(s.end_time)}`, `ts-${i}`)}>
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No history yet. Upload a video above.</p>
            </div>
          ) : (
            history.map(h => {
              const sug = (h.suggestions as Suggestion[]) || [];
              return (
                <Card key={h.id} className="card-hover cursor-pointer" onClick={() => {
                  setSuggestions(sug);
                  setStep("done");
                  setTab("upload");
                }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <FileAudio className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{h.source_filename || "Unknown file"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(h.created_at)} · {sug.length} clips</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
