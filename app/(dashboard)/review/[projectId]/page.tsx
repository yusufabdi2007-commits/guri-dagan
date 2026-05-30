import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ReviewClient } from "@/components/review/ReviewClient";

export default async function ReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: video } = await supabase
    .from("videos")
    .select("id, title, url, thumbnail_url, platform, status, views, likes, notes, recorded_at, edited_at, posted_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!video) notFound();

  const [{ data: review }, { data: markers }] = await Promise.all([
    supabase
      .from("video_reviews")
      .select("*")
      .eq("video_id", projectId)
      .single(),
    supabase
      .from("review_markers")
      .select("*")
      .eq("video_id", projectId)
      .order("timestamp_seconds", { ascending: true }),
  ]);

  return (
    <ReviewClient
      video={video}
      initialReview={review ?? null}
      initialMarkers={markers ?? []}
    />
  );
}
