"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Loader2, Sparkles, Plus, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedIdea {
  title: string;
  hook: string;
  platform: string;
  category: string;
}

interface Props {
  userId: string;
  onIdeaSaved?: () => void;
}

export function VoiceCapture({ userId, onIdeaSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunks.current, { type: mimeType });
        await processAudio(blob, mimeType);
      };

      recorder.start(250);
      setRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
      setProcessing(true);
    }
  }, [recording]);

  async function processAudio(blob: Blob, mimeType: string) {
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("audio", blob, `voice-idea.${ext}`);

    try {
      const res = await fetch("/api/voice-idea", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Processing failed. Please try again.");
        setProcessing(false);
        return;
      }

      setTranscript(data.transcript);
      setIdeas(data.ideas || []);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setProcessing(false);
    }
  }

  async function saveIdea(idea: GeneratedIdea, index: number) {
    const supabase = createClient();
    const { error } = await supabase.from("content_ideas").insert({
      user_id: userId,
      title: idea.title,
      hook: idea.hook,
      platform: idea.platform,
      category: idea.category,
      status: "Idea",
      notes: transcript ? `From voice note: "${transcript.slice(0, 200)}${transcript.length > 200 ? "..." : ""}"` : null,
    });

    if (error) {
      toast({ title: "Could not save idea", variant: "destructive" });
    } else {
      setSaved(prev => new Set(prev).add(index));
      toast({ title: "Idea saved!", variant: "success" });
      onIdeaSaved?.();
    }
  }

  function reset() {
    setTranscript(null);
    setIdeas([]);
    setSaved(new Set());
    setError(null);
    setProcessing(false);
    setRecording(false);
  }

  function close() {
    if (recording) {
      mediaRecorder.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    }
    reset();
    setIsOpen(false);
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center tap-scale md:bottom-6"
        aria-label="Capture voice idea"
      >
        <Mic className="h-5 w-5 text-white" />
      </button>

      {/* Sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 bg-background rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Voice Idea Capture</h3>
              <button onClick={close} className="p-1.5 rounded-xl hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            {/* Recording / idle state */}
            {!processing && ideas.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-4">
                <button
                  onPointerDown={startRecording}
                  onPointerUp={recording ? stopRecording : undefined}
                  onClick={recording ? stopRecording : undefined}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 tap-scale",
                    recording
                      ? "bg-red-500 scale-110 glow-pulse"
                      : "gradient-primary"
                  )}
                >
                  {recording ? (
                    <Square className="h-7 w-7 text-white fill-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </button>
                <p className="text-sm text-muted-foreground text-center">
                  {recording
                    ? "Recording... tap to stop"
                    : "Tap and speak your idea in Somali or English"}
                </p>
                {recording && (
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-red-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Processing */}
            {processing && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Listening and generating ideas...</p>
              </div>
            )}

            {/* Results */}
            {ideas.length > 0 && (
              <>
                {transcript && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Transcript
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{transcript}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {ideas.map((idea, i) => (
                    <Card key={i} className="border border-border/60">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {idea.platform}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{idea.category}</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground leading-snug mb-1">{idea.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{idea.hook}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => saveIdea(idea, i)}
                          disabled={saved.has(i)}
                          className={cn(
                            "w-full mt-3 h-8 text-xs rounded-xl",
                            saved.has(i) ? "bg-green-500 hover:bg-green-500" : ""
                          )}
                        >
                          {saved.has(i) ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Saved
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Save to Ideas
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <button
                  onClick={reset}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-2xl transition-colors"
                >
                  Record another
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
