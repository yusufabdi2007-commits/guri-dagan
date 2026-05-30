"use client";

import { useState } from "react";
import { Video, Platform, VideoStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Plus, Video as VideoIcon, ExternalLink, Pencil, Trash2, Eye, Heart, Bookmark, MessageSquare, ScanSearch } from "lucide-react";
import { getStatusColor, getPlatformColor, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];
const STATUSES: VideoStatus[] = ["Recorded", "Editing", "Edited", "Posted"];

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface Props {
  videos: Video[];
  userId: string;
}

const emptyForm = {
  title: "",
  platform: "TikTok" as Platform,
  status: "Recorded" as VideoStatus,
  url: "",
  notes: "",
  views: "",
  likes: "",
  saves: "",
  comments: "",
  performance_notes: "",
};

export function VideosClient({ videos: initial, userId }: Props) {
  const [videos, setVideos] = useState(initial);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = videos.filter(v => filterStatus === "all" || v.status === filterStatus);

  function openAdd() {
    setEditingVideo(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(video: Video) {
    setEditingVideo(video);
    setForm({
      title: video.title,
      platform: video.platform,
      status: video.status,
      url: video.url || "",
      notes: video.notes || "",
      views: video.views != null ? String(video.views) : "",
      likes: video.likes != null ? String(video.likes) : "",
      saves: video.saves != null ? String(video.saves) : "",
      comments: video.comments != null ? String(video.comments) : "",
      performance_notes: video.performance_notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const perfFields = {
      views: form.views !== "" ? parseInt(form.views) || 0 : null,
      likes: form.likes !== "" ? parseInt(form.likes) || 0 : null,
      saves: form.saves !== "" ? parseInt(form.saves) || 0 : null,
      comments: form.comments !== "" ? parseInt(form.comments) || 0 : null,
      performance_notes: form.performance_notes || null,
    };

    if (editingVideo) {
      const { data, error } = await supabase
        .from("videos")
        .update({
          title: form.title, platform: form.platform, status: form.status,
          url: form.url, notes: form.notes,
          ...perfFields,
          posted_at: form.status === "Posted" && !editingVideo.posted_at ? new Date().toISOString() : editingVideo.posted_at,
        })
        .eq("id", editingVideo.id)
        .select()
        .single();
      if (!error && data) {
        setVideos(prev => prev.map(v => v.id === data.id ? data : v));
        toast({ title: "Video updated!" });
      }
    } else {
      const { data, error } = await supabase
        .from("videos")
        .insert({
          title: form.title, platform: form.platform, status: form.status,
          url: form.url, notes: form.notes,
          user_id: userId,
          recorded_at: new Date().toISOString(),
          posted_at: form.status === "Posted" ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (!error && data) {
        setVideos(prev => [data, ...prev]);
        toast({ title: "Video added!" });
      }
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("videos").delete().eq("id", id);
    setVideos(prev => prev.filter(v => v.id !== id));
    toast({ title: "Video deleted" });
  }

  async function handleStatusChange(video: Video, status: VideoStatus) {
    const supabase = createClient();
    const updates: Partial<Video> = { status };
    if (status === "Posted" && !video.posted_at) updates.posted_at = new Date().toISOString();
    if (status === "Edited" && !video.edited_at) updates.edited_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("videos")
      .update(updates)
      .eq("id", video.id)
      .select()
      .single();

    if (!error && data) {
      setVideos(prev => prev.map(v => v.id === data.id ? data : v));
    }
  }

  const stats = {
    total: videos.length,
    recorded: videos.filter(v => v.status === "Recorded").length,
    editing: videos.filter(v => v.status === "Editing").length,
    edited: videos.filter(v => v.status === "Edited").length,
    posted: videos.filter(v => v.status === "Posted").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Recorded", count: stats.recorded, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
          { label: "Editing", count: stats.editing, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Edited", count: stats.edited, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
          { label: "Posted", count: stats.posted, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
            <div className="text-xl font-bold">{count}</div>
            <div className="text-[10px] font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {["all", ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <Button size="icon" onClick={openAdd} className="shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Video List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 spring-in">
          <div className="w-16 h-16 gradient-warm rounded-2xl flex items-center justify-center mx-auto mb-4 momentum-glow">
            <VideoIcon className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-foreground mb-1">One short video can create momentum.</p>
          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto mt-1 leading-relaxed">
            Track your first recording here. Every video you post is a step toward consistency.
          </p>
          <Button onClick={openAdd} className="mt-5 tap-scale btn-ripple">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Video
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(video => {
            const ytId = video.url ? getYouTubeId(video.url) : null;
            const thumbUrl = ytId
              ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
              : video.thumbnail_url || null;
            return (
            <Card key={video.id} className="card-hover overflow-hidden">
              {thumbUrl && (
                <div className="relative w-full h-32 bg-muted overflow-hidden">
                  <img
                    src={thumbUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {ytId && (
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-white border-b-[7px] border-b-transparent ml-1" />
                      </div>
                    </a>
                  )}
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-2">
                      {video.title}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${getPlatformColor(video.platform)}`}>
                        {video.platform}
                      </span>
                      {video.url && (
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-muted text-primary flex items-center gap-1"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(video, s)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all ${
                            video.status === s ? getStatusColor(s) : "bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {video.posted_at && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        Posted {formatDate(video.posted_at)}
                      </p>
                    )}
                    {video.status === "Posted" && (video.views != null || video.likes != null || video.saves != null) && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                        {video.views != null && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Eye className="h-2.5 w-2.5" />
                            {video.views.toLocaleString()}
                          </span>
                        )}
                        {video.likes != null && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Heart className="h-2.5 w-2.5" />
                            {video.likes.toLocaleString()}
                          </span>
                        )}
                        {video.saves != null && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Bookmark className="h-2.5 w-2.5" />
                            {video.saves.toLocaleString()}
                          </span>
                        )}
                        {video.comments != null && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MessageSquare className="h-2.5 w-2.5" />
                            {video.comments.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/review/${video.id}`}>
                      <Button variant="ghost" size="icon-sm" title="Review Mode">
                        <ScanSearch className="h-3.5 w-3.5 text-violet-500" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(video)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(video.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Edit Video" : "Add Video"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Video title..."
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v as Platform }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as VideoStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Video URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes..."
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            {(form.status === "Posted" || editingVideo?.status === "Posted") && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Performance Stats (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" />Views</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={form.views}
                        onChange={e => setForm(f => ({ ...f, views: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Heart className="h-3 w-3" />Likes</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={form.likes}
                        onChange={e => setForm(f => ({ ...f, likes: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Bookmark className="h-3 w-3" />Saves</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={form.saves}
                        onChange={e => setForm(f => ({ ...f, saves: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><MessageSquare className="h-3 w-3" />Comments</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={form.comments}
                        onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <Label className="text-xs">Performance Notes</Label>
                    <Input
                      placeholder="e.g. High retention, strong hook..."
                      value={form.performance_notes}
                      onChange={e => setForm(f => ({ ...f, performance_notes: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingVideo ? "Update" : "Add Video"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
