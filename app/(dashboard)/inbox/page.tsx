import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { InboxClient } from "@/components/inbox/InboxClient";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: questions } = await supabase
    .from("question_inbox")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Question Inbox" subtitle="Turn audience questions into content" />
      <InboxClient questions={questions || []} userId={user!.id} />
    </div>
  );
}
