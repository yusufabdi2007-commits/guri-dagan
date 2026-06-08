import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TranscriptClient } from "@/components/transcript/TranscriptClient";

export default async function TranscriptPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: history } = await supabase
    .from("shorts_suggestions")
    .select("id, source_filename, created_at, suggestions")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Shorts Generator" subtitle="Turn videos into viral clips" />
      <TranscriptClient history={history || []} userId={user!.id} />
    </div>
  );
}
