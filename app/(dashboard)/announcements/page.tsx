import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AnnouncementsClient } from "@/components/announcements/AnnouncementsClient";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("user_id", user!.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Community"
        subtitle="Share updates, wins, and resources with your audience"
      />
      <AnnouncementsClient
        announcements={announcements || []}
        userId={user!.id}
      />
    </div>
  );
}
