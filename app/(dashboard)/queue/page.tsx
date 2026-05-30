import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { QueueClient } from "@/components/queue/QueueClient";

export default async function QueuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("recording_queue")
    .select("*")
    .eq("user_id", user!.id)
    .order("priority_order", { ascending: true });

  const { data: ideas } = await supabase
    .from("content_ideas")
    .select("id, title, hook, category")
    .eq("user_id", user!.id)
    .in("status", ["Idea", "Ready"])
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Recording Queue" subtitle="What to film today" />
      <QueueClient items={items || []} ideas={ideas || []} userId={user!.id} />
    </div>
  );
}
