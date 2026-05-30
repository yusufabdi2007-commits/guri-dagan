"use client";

import { useState } from "react";
import { AlertTriangle, X, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Impact = "low" | "medium" | "high";

interface FrictionEntry {
  id: string;
  what: string;
  impact: Impact;
  ts: number;
  page: string;
}

const STORAGE_KEY = "friction_log";

function saveEntry(entry: FrictionEntry) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: FrictionEntry[] = raw ? JSON.parse(raw) : [];
    existing.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch {
    // localStorage unavailable — silently skip
  }
}

export function FrictionButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [impact, setImpact] = useState<Impact>("medium");
  const [saved, setSaved] = useState(false);

  function submit() {
    if (!text.trim()) return;
    saveEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      what: text.trim(),
      impact,
      ts: Date.now(),
      page: typeof window !== "undefined" ? window.location.pathname : "/",
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setText("");
      setImpact("medium");
      setOpen(false);
    }, 1200);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Report a friction point"
        className="fixed bottom-24 right-4 md:bottom-6 z-40 w-9 h-9 rounded-full bg-muted border border-border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-colors opacity-60 hover:opacity-100"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 z-50 w-72 bg-card border border-border rounded-2xl shadow-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Log friction</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <Textarea
        placeholder="What slowed you down or felt confusing?"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        className="text-sm resize-none mb-3"
        autoFocus
      />

      <div className="flex gap-1.5 mb-3">
        {(["low", "medium", "high"] as Impact[]).map(lvl => (
          <button
            key={lvl}
            onClick={() => setImpact(lvl)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all border ${
              impact === lvl
                ? lvl === "high"
                  ? "bg-rose-500 text-white border-rose-500"
                  : lvl === "medium"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-blue-500 text-white border-blue-500"
                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!text.trim() || saved}
        className="w-full h-9 text-sm font-semibold"
      >
        {saved ? (
          <><Check className="h-3.5 w-3.5 mr-2" /> Logged</>
        ) : (
          <><Send className="h-3.5 w-3.5 mr-2" /> Log it</>
        )}
      </Button>
    </div>
  );
}
