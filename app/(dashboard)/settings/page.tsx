import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const safeProfile = profile ?? {
    display_name: null,
    weekly_goal: 5,
    preferred_platform: "TikTok",
    coach_tone: "Warm & Encouraging",
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Settings" subtitle="Preferences and goals" />
      <SettingsClient profile={safeProfile} userId={user!.id} />
    </div>
  );
}
