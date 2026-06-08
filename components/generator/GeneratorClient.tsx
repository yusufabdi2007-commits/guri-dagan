"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, CheckCheck, Loader2, Zap, BookmarkPlus, AlertCircle } from "lucide-react";
import { Platform, GeneratedContent } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];
const TONES = ["Warm & Encouraging", "Direct & Practical", "Storytelling", "Islamic Perspective", "Educational", "Motivational"];
const AUDIENCES = ["New parents", "Parents of teenagers", "Mothers", "Fathers", "Single parents", "All parents"];

export function GeneratorClient() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [tone, setTone] = useState(TONES[0]);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [usedTopics, setUsedTopics] = useState<string[]>([]);
  const topicWarning = topic.trim().length > 5 && usedTopics.some(t =>
    t.toLowerCase().includes(topic.toLowerCase().slice(0, 10)) ||
    topic.toLowerCase().includes(t.toLowerCase().slice(0, 10))
  );

  useEffect(() => {
    fetch("/api/memory")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setUsedTopics(data.map((d: { topic: string }) => d.topic));
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone, audience }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setResult(data);
      // Record to content memory (fire-and-forget)
      fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          hook_used: data.hooks?.[0] || null,
          tone_used: tone,
        }),
      }).catch(() => {});
    } catch {
      toast({ title: "Generation failed. Check your OpenAI API key.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function saveToIdeas() {
    if (!result) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const title = result.titles[0] || topic;
      const hook = result.hooks[0] || "";

      const { error } = await supabase.from("content_ideas").insert({
        user_id: user.id,
        title,
        hook,
        platform,
        category: "Parenting Tips",
        status: "Idea",
        notes: result.script ? `Script:\n${result.script}` : undefined,
      });

      if (error) throw error;
      toast({ title: "Saved to Ideas!", description: title, variant: "success" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!" });
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Input Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Topic / Subject *</Label>
            <Textarea
              placeholder="e.g. How to calm a crying toddler at night, the importance of daily family conversations, dealing with screen time addiction..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </div>

          {topicWarning && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You&apos;ve generated content on a similar topic before. Consider a fresh angle or different hook style.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12"
            size="lg"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" />Generate with AI</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="border-primary/30">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center animate-pulse-soft">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium">Creating Somali parenting content...</p>
              <p className="text-xs text-muted-foreground">This takes a few seconds</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Save to Ideas */}
          <Button
            onClick={saveToIdeas}
            disabled={saving}
            variant="outline"
            className="w-full h-11 border-2 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
          >
            <BookmarkPlus className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save to Ideas"}
          </Button>

          <Tabs defaultValue="hooks">
            <TabsList className="w-full grid grid-cols-4 h-10">
              <TabsTrigger value="hooks" className="text-xs">Hooks</TabsTrigger>
              <TabsTrigger value="titles" className="text-xs">Titles</TabsTrigger>
              <TabsTrigger value="script" className="text-xs">Script</TabsTrigger>
              <TabsTrigger value="captions" className="text-xs">Captions</TabsTrigger>
            </TabsList>

            <TabsContent value="hooks" className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">TikTok / Short Video Hooks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.hooks.map((hook, i) => (
                    <ContentBlock key={i} text={hook} onCopy={() => copyText(hook, `hook-${i}`)} copied={copied === `hook-${i}`} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="titles">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">YouTube / Video Titles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.titles.map((title, i) => (
                    <ContentBlock key={i} text={title} onCopy={() => copyText(title, `title-${i}`)} copied={copied === `title-${i}`} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="script">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Short Script</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground bg-muted/30 rounded-xl p-4">
                      {result.script}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyText(result.script, "script")}
                    >
                      {copied === "script" ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="captions" className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Captions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.captions.map((caption, i) => (
                    <ContentBlock key={i} text={caption} onCopy={() => copyText(caption, `caption-${i}`)} copied={copied === `caption-${i}`} />
                  ))}
                </CardContent>
              </Card>

              {result.cta.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Call to Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.cta.map((cta, i) => (
                      <ContentBlock key={i} text={cta} onCopy={() => copyText(cta, `cta-${i}`)} copied={copied === `cta-${i}`} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {result.hashtags.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Hashtags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.hashtags.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => copyText(tag, `tag-${i}`)}
                          className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-medium hover:bg-primary/20 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => copyText(result.hashtags.join(" "), "hashtags")}
                    >
                      {copied === "hashtags" ? <CheckCheck className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copy All Hashtags
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function ContentBlock({ text, onCopy, copied }: { text: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="relative group bg-muted/30 rounded-xl p-4">
      <p className="text-sm text-foreground leading-relaxed pr-8">{text}</p>
      <button
        onClick={onCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all"
      >
        {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
}
