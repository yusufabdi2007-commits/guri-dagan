import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CheckinsClient } from "@/components/checkins/CheckinsClient";

export default async function CheckinsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: children }, { data: checkins }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, child_name, program, status")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("child_name"),
    supabase
      .from("progress_checkins")
      .select("*, child_profiles(id, child_name, program)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Weekly Check-ins" subtitle="Track every child's weekly progress" />
      <CheckinsClient activeChildren={children || []} recentCheckins={checkins || []} />
    </div>
  );
}
