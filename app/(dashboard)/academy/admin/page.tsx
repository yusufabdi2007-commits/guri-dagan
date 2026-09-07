import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AcademyAdminClient } from "@/components/academy/AcademyAdminClient";

export default async function AcademyAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tracks } = await supabase
    .from("academy_tracks")
    .select("*, academy_chapters(id)")
    .eq("user_id", user!.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="The Academy" subtitle="Tracks, chapters and the student roster" />
      <AcademyAdminClient initialTracks={tracks || []} />
    </div>
  );
}
