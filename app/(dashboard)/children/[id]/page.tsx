import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ChildProfileClient } from "@/components/children/ChildProfileClient";
import { notFound } from "next/navigation";

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: child }, { data: enrollments }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select(`
        *,
        child_goals(id, goal_title, category, target_score, current_score, achieved, created_at),
        progress_checkins(id, week_number, confidence_score, resilience_score, emotional_regulation_score, communication_score, parent_notes, coach_notes, created_at),
        milestones(id, title, description, category, achieved_at),
        success_stories(id, title, story, status, created_at)
      `)
      .eq("id", id)
      .eq("user_id", user!.id)
      .single(),
    supabase
      .from("client_enrollments")
      .select("id, parent_name, program")
      .eq("user_id", user!.id),
  ]);

  if (!child) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Header title={child.child_name} subtitle={child.program ?? "Child Profile"} />
      <ChildProfileClient child={child} enrollments={enrollments || []} />
    </div>
  );
}
