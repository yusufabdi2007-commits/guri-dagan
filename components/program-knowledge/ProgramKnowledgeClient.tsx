"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, BookOpen, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const PROGRAMS = [
  { name: "MePower™", description: "Self-esteem, confidence, identity from the inside out", color: "sky" },
  { name: "Inner Power™", description: "Inner compass, core values, self-direction, peer pressure", color: "violet" },
  { name: "MindPower™", description: "Brain science, mindset, self-talk, fixed vs growth thinking", color: "emerald" },
  { name: "DreamPower™", description: "Vision, goal-setting, visualisation, Law of Attraction", color: "amber" },
  { name: "Slaying Dragons™", description: "Fear, resilience, courage, handling failure and change", color: "rose" },
] as const;

interface KnowledgeEntry {
  id: string;
  program_name: string;
  file_name: string;
  char_count: number;
  indexed_at: string;
}

interface Props {
  initialEntries: KnowledgeEntry[];
}

const colorMap = {
  sky: "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 dark:text-rose-400",
};

const iconBgMap = {
  sky: "bg-sky-500/10 text-sky-500",
  violet: "bg-violet-500/10 text-violet-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  amber: "bg-amber-500/10 text-amber-500",
  rose: "bg-rose-500/10 text-rose-500",
};

// Extract up to ~200 chars of context around the first match in a block of text
function getSnippet(text: string, query: string): string | null {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + query.length + 120);
  let snippet = text.slice(start, end).replace(/\s+/g, " ");
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet;
}

// Estimate quality from character count
function qualityLabel(chars: number): { label: string; color: string } {
  if (chars >= 15000) return { label: "Rich", color: "text-emerald-600 dark:text-emerald-400" };
  if (chars >= 5000) return { label: "Good", color: "text-blue-600 dark:text-blue-400" };
  if (chars >= 1000) return { label: "Partial", color: "text-amber-600 dark:text-amber-400" };
  return { label: "Sparse", color: "text-red-500" };
}

export function ProgramKnowledgeClient({ initialEntries }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getEntry(programName: string) {
    return entries.find(e => e.program_name === programName) ?? null;
  }

  // Search all curricula — loads any un-cached previews, then searches
  async function handleSearch() {
    if (!searchQuery.trim() || entries.length === 0) return;
    setSearching(true);
    // Load any uncached curricula
    const uncached = entries.filter(e => !previewText[e.program_name]);
    await Promise.all(
      uncached.map(async (e) => {
        try {
          const res = await fetch(`/api/program-knowledge/${e.id}`);
          if (res.ok) {
            const data = await res.json();
            setPreviewText(prev => ({ ...prev, [e.program_name]: data.extracted_text as string }));
          }
        } catch { /* ignore */ }
      })
    );
    setSearching(false);
  }

  async function handleUpload(programName: string, file: File) {
    if (!file) return;
    // Duplicate filename detection
    const existing = getEntry(programName);
    if (existing && existing.file_name === file.name) {
      const confirmed = confirm(`"${file.name}" is the same filename as the existing PDF. Upload anyway to replace it?`);
      if (!confirmed) {
        if (fileInputRefs.current[programName]) fileInputRefs.current[programName]!.value = "";
        return;
      }
    }
    setUploading(programName);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("program_name", programName);

      const res = await fetch("/api/program-knowledge", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error || "Upload failed", variant: "destructive" });
        return;
      }

      setEntries(prev => {
        const filtered = prev.filter(e => e.program_name !== programName);
        return [...filtered, data as KnowledgeEntry].sort((a, b) =>
          a.program_name.localeCompare(b.program_name)
        );
      });
      // Clear cached preview so it refreshes next time
      setPreviewText(prev => { const next = { ...prev }; delete next[programName]; return next; });

      // Surface quality warnings if any
      const quality = (data as Record<string, unknown>).quality as { quality: string; warnings: string[]; charCount: number; estimatedPages: number } | undefined;
      if (quality?.warnings && quality.warnings.length > 0) {
        toast({ title: `${programName} indexed — quality warning`, description: quality.warnings[0], variant: "destructive" });
      } else if (quality) {
        toast({
          title: `${programName} knowledge indexed`,
          description: `${quality.charCount.toLocaleString()} chars · ~${quality.estimatedPages} page(s) · Quality: ${quality.quality}`,
        });
      } else {
        toast({ title: `${programName} knowledge indexed`, description: `${(data.char_count as number).toLocaleString()} characters extracted` });
      }
      router.refresh();
    } catch {
      toast({ title: "Upload failed — please try again", variant: "destructive" });
    } finally {
      setUploading(null);
      // Reset the file input
      if (fileInputRefs.current[programName]) {
        fileInputRefs.current[programName]!.value = "";
      }
    }
  }

  async function handleDelete(entry: KnowledgeEntry) {
    if (!confirm(`Remove ${entry.program_name} curriculum? Scripts will fall back to built-in knowledge.`)) return;
    setDeleting(entry.program_name);
    try {
      const res = await fetch(`/api/program-knowledge/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "Delete failed", variant: "destructive" });
        return;
      }
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setPreviewText(prev => { const next = { ...prev }; delete next[entry.program_name]; return next; });
      if (previewing === entry.program_name) setPreviewing(null);
      toast({ title: `${entry.program_name} knowledge removed` });
      router.refresh();
    } catch {
      toast({ title: "Delete failed — please try again", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  async function handleTogglePreview(programName: string) {
    if (previewing === programName) {
      setPreviewing(null);
      return;
    }
    setPreviewing(programName);
    if (previewText[programName]) return; // already loaded

    const entry = getEntry(programName);
    if (!entry) return;

    setLoadingPreview(programName);
    try {
      const res = await fetch(`/api/program-knowledge/${entry.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewText(prev => ({ ...prev, [programName]: data.extracted_text as string }));
      }
    } catch {
      // ignore preview load failure
    } finally {
      setLoadingPreview(null);
    }
  }

  const uploadedCount = entries.length;

  // Compute search results (only across loaded previews)
  const searchResults: { programName: string; snippet: string }[] = [];
  if (searchQuery.trim().length > 2) {
    for (const [prog, text] of Object.entries(previewText)) {
      const snippet = getSnippet(text, searchQuery.trim());
      if (snippet) searchResults.push({ programName: prog, snippet });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">

      {/* Status banner */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {uploadedCount === 0
                ? "No curriculum uploaded yet"
                : uploadedCount === 5
                  ? "All 5 programs have curriculum"
                  : `${uploadedCount} of 5 programs indexed`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {uploadedCount === 0
                ? "Upload PDFs to unlock curriculum-grounded script generation"
                : "AI will use these curricula as factual grounding — never copying verbatim"}
            </p>
          </div>
          {uploadedCount > 0 && (
            <div className={cn(
              "shrink-0 text-sm font-bold px-3 py-1 rounded-xl",
              uploadedCount === 5 ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
            )}>
              {uploadedCount}/5
            </div>
          )}
        </div>
      </div>

      {/* Curriculum Search */}
      {uploadedCount > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search across all curricula…"
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searching}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition shrink-0"
            >
              {searching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Search"}
            </button>
          </div>
          {searchQuery.trim().length > 2 && (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">
                  {Object.keys(previewText).length === 0
                    ? "Click Search to load and search all curricula"
                    : `No matches found across ${Object.keys(previewText).length} loaded programme(s)`}
                </p>
              ) : (
                searchResults.map(({ programName, snippet }) => (
                  <div key={programName} className="bg-muted/40 border border-border rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">{programName}</p>
                    <p className="text-xs text-foreground leading-relaxed">{snippet}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Program cards */}
      <div className="space-y-3">
        {PROGRAMS.map(({ name, description, color }) => {
          const entry = getEntry(name);
          const isUploading = uploading === name;
          const isDeleting = deleting === name;
          const isPreviewing = previewing === name;
          const isLoadingPreview = loadingPreview === name;

          return (
            <div key={name} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", iconBgMap[color])}>
                    <BookOpen className="h-4 w-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      {entry ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-lg">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-lg">
                          <AlertCircle className="h-3 w-3" />
                          No PDF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    {entry && (() => {
                      const q = qualityLabel(entry.char_count);
                      return (
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          {entry.file_name} · {entry.char_count.toLocaleString()} chars ·{" "}
                          <span className={cn("font-semibold", q.color)}>{q.label}</span> ·{" "}
                          {new Date(entry.indexed_at).toLocaleDateString()}
                        </p>
                      );
                    })()}
                  </div>

                  {/* Badge */}
                  <div className={cn("shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg border", colorMap[color])}>
                    {name.replace("™", "")}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 ml-13">
                  {/* Hidden file input */}
                  <input
                    ref={el => { fileInputRefs.current[name] = el; }}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(name, file);
                    }}
                  />

                  {/* Upload / Replace button */}
                  <button
                    onClick={() => fileInputRefs.current[name]?.click()}
                    disabled={isUploading || isDeleting}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                      entry
                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                      (isUploading || isDeleting) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isUploading ? (
                      <><RefreshCw className="h-3 w-3 animate-spin" />Indexing...</>
                    ) : (
                      <><Upload className="h-3 w-3" />{entry ? "Replace PDF" : "Upload PDF"}</>
                    )}
                  </button>

                  {/* Preview button (only if indexed) */}
                  {entry && (
                    <button
                      onClick={() => handleTogglePreview(name)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
                    >
                      {isLoadingPreview ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : isPreviewing ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      Preview
                    </button>
                  )}

                  {/* Delete button */}
                  {entry && (
                    <button
                      onClick={() => handleDelete(entry)}
                      disabled={isDeleting || isUploading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Extracted text preview */}
              {isPreviewing && entry && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Extracted Text Preview
                  </p>
                  {isLoadingPreview || !previewText[name] ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <textarea
                      readOnly
                      value={previewText[name]}
                      rows={10}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-mono resize-none text-foreground leading-relaxed"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">How AI uses this curriculum</p>
        <ul className="space-y-1.5">
          {[
            "When you generate scripts on Weekly Assignment, the AI detects each video's program",
            "It retrieves the relevant curriculum sections and uses them as factual grounding",
            "Scripts teach the real concepts naturally — never copying text verbatim",
            "If no PDF is uploaded for a program, it falls back to built-in knowledge",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
