"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, TrendingUp, Heart, Share2, Bookmark, MessageCircle,
  Eye, ChevronDown, ChevronUp, Trash2, X, Trophy, Flame, BarChart3
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface TikTokPost {
  id: string;
  title: string;
  posted_at: string;
  views: number;
  likes: number;
  shares: number;
  saves: number;
  comments: number;
  completion_rate: number;
  emotional_tag: string | null;
  topic_category: string | null;
  hook_text: string | null;
  notes: string | null;
}

interface Props {
  posts: TikTokPost[];
  userId: string;
}

const EMOTIONAL_TAGS = ["inspiring", "funny", "educational", "emotional", "practical", "story"];
const TAG_COLORS: Record<string, string> = {
  inspiring: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  funny: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  educational: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  emotional: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  practical: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  story: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
};

const emptyForm = {
  title: "",
  posted_at: new Date().toISOString().split("T")[0],
  views: "",
  likes: "",
  shares: "",
  saves: "",
  comments: "",
  completion_rate: "",
  emotional_tag: "",
  topic_category: "",
  hook_text: "",
  notes: "",
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function TikTokClient({ posts: initialPosts, userId }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tiktok_posts")
      .insert({
        user_id: userId,
        title: form.title.trim(),
        posted_at: form.posted_at,
        views: parseInt(form.views) || 0,
        likes: parseInt(form.likes) || 0,
        shares: parseInt(form.shares) || 0,
        saves: parseInt(form.saves) || 0,
        comments: parseInt(form.comments) || 0,
        completion_rate: parseFloat(form.completion_rate) || 0,
        emotional_tag: form.emotional_tag || null,
        topic_category: form.topic_category || null,
        hook_text: form.hook_text || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return;
    }
    setPosts(prev => [data, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
    toast({ title: "Post added!", variant: "success" });
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("tiktok_posts").delete().eq("id", id);
    setPosts(prev => prev.filter(p => p.id !== id));
    toast({ title: "Post removed" });
  }

  // Analytics
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const totalShares = posts.reduce((s, p) => s + p.shares, 0);
  const avgCompletion = posts.length
    ? Math.round(posts.reduce((s, p) => s + p.completion_rate, 0) / posts.length)
    : 0;

  const topPost = [...posts].sort((a, b) => b.views - a.views)[0];

  const tagPerformance = EMOTIONAL_TAGS.map(tag => {
    const tagPosts = posts.filter(p => p.emotional_tag === tag);
    const avgViews = tagPosts.length
      ? Math.round(tagPosts.reduce((s, p) => s + p.views, 0) / tagPosts.length)
      : 0;
    return { tag, count: tagPosts.length, avgViews };
  }).filter(t => t.count > 0).sort((a, b) => b.avgViews - a.avgViews);

  const sortedPosts = [...posts].sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Views</span>
            </div>
            <div className="text-2xl font-bold">{fmt(totalViews)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Total Likes</span>
            </div>
            <div className="text-2xl font-bold">{fmt(totalLikes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Total Shares</span>
            </div>
            <div className="text-2xl font-bold">{fmt(totalShares)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Avg Completion</span>
            </div>
            <div className="text-2xl font-bold">{avgCompletion}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Top performer */}
      {topPost && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">
                  Top Performing Post
                </p>
                <p className="text-sm font-medium text-foreground line-clamp-1">{topPost.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(topPost.views)}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(topPost.likes)}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{fmt(topPost.shares)}</span>
                </div>
              </div>
              {topPost.emotional_tag && (
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${TAG_COLORS[topPost.emotional_tag] || ""}`}>
                  {topPost.emotional_tag}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional tag performance */}
      {tagPerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Content Type Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {tagPerformance.map((t, i) => {
              const max = tagPerformance[0]?.avgViews || 1;
              const pct = (t.avgViews / max) * 100;
              return (
                <div key={t.tag}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium px-2 py-0.5 rounded-lg ${TAG_COLORS[t.tag] || ""}`}>
                      {t.tag}
                    </span>
                    <span className="text-muted-foreground">{fmt(t.avgViews)} avg views · {t.count} posts</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500 gradient-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Add post button */}
      <Button
        onClick={() => setShowForm(!showForm)}
        variant={showForm ? "outline" : "default"}
        className="w-full h-11"
      >
        {showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Add TikTok Post</>}
      </Button>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Video Title *</Label>
              <Input
                placeholder="e.g. How to talk to your teenager about respect"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Posted Date</Label>
                <Input
                  type="date"
                  value={form.posted_at}
                  onChange={e => setForm(f => ({ ...f, posted_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={form.emotional_tag} onValueChange={v => setForm(f => ({ ...f, emotional_tag: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {EMOTIONAL_TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Eye className="h-3 w-3" /> Views</Label>
                <Input type="number" placeholder="0" value={form.views} onChange={e => setForm(f => ({ ...f, views: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> Likes</Label>
                <Input type="number" placeholder="0" value={form.likes} onChange={e => setForm(f => ({ ...f, likes: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Share2 className="h-3 w-3 text-green-500" /> Shares</Label>
                <Input type="number" placeholder="0" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Bookmark className="h-3 w-3 text-blue-500" /> Saves</Label>
                <Input type="number" placeholder="0" value={form.saves} onChange={e => setForm(f => ({ ...f, saves: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-purple-500" /> Comments</Label>
                <Input type="number" placeholder="0" value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-orange-500" /> Completion %</Label>
                <Input type="number" placeholder="0-100" value={form.completion_rate} onChange={e => setForm(f => ({ ...f, completion_rate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hook Text (first 3 seconds)</Label>
              <Input
                placeholder="What did you open with?"
                value={form.hook_text}
                onChange={e => setForm(f => ({ ...f, hook_text: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Topic Category</Label>
              <Input
                placeholder="e.g. Teen Communication, Screen Time, Islamic Parenting"
                value={form.topic_category}
                onChange={e => setForm(f => ({ ...f, topic_category: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What worked? What would you change?"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 font-semibold">
              {saving ? "Saving..." : "Save Post"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Posts list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">All Posts ({posts.length})</h3>
        </div>

        {sortedPosts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No posts tracked yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first TikTok post above.</p>
            </CardContent>
          </Card>
        ) : (
          sortedPosts.map(post => {
            const isExpanded = expandedId === post.id;
            return (
              <Card key={post.id} className="card-hover">
                <CardContent className="p-4">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedId(isExpanded ? null : post.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{post.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(post.posted_at), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Eye className="h-3 w-3" />{fmt(post.views)}
                          </span>
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" />{fmt(post.likes)}</span>
                          <span className="flex items-center gap-1"><Share2 className="h-3 w-3 text-green-400" />{fmt(post.shares)}</span>
                          {post.completion_rate > 0 && (
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{post.completion_rate}%</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {post.emotional_tag && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${TAG_COLORS[post.emotional_tag] || "bg-muted text-muted-foreground"}`}>
                            {post.emotional_tag}
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-muted/40 rounded-xl">
                          <div className="text-sm font-bold">{fmt(post.saves)}</div>
                          <div className="text-[10px] text-muted-foreground">Saves</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-xl">
                          <div className="text-sm font-bold">{fmt(post.comments)}</div>
                          <div className="text-[10px] text-muted-foreground">Comments</div>
                        </div>
                        <div className="p-2 bg-muted/40 rounded-xl">
                          <div className="text-sm font-bold">{post.completion_rate}%</div>
                          <div className="text-[10px] text-muted-foreground">Watched</div>
                        </div>
                      </div>
                      {post.hook_text && (
                        <div className="p-3 rounded-xl bg-primary/5">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Hook</p>
                          <p className="text-xs text-foreground italic">&quot;{post.hook_text}&quot;</p>
                        </div>
                      )}
                      {post.notes && (
                        <p className="text-xs text-muted-foreground">{post.notes}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(post.id)}
                        className="w-full text-destructive hover:text-destructive h-8 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
