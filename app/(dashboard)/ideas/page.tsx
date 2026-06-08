import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { IdeasClient } from "@/components/ideas/IdeasClient";
import { VoiceCapture } from "@/components/ideas/VoiceCapture";

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ideas } = await supabase
    .from("content_ideas")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Content Ideas" subtitle="Your idea database" />
      <IdeasClient ideas={ideas || []} userId={user!.id} />
      <VoiceCapture userId={user!.id} />
    </div>
  );
}
