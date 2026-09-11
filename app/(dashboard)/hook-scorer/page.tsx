import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { HookScorerClient } from "@/components/hook-scorer/HookScorerClient";

export default async function HookScorerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Hook Scorer" subtitle="Score and improve your hooks with AI" />
      <HookScorerClient />
    </div>
  );
}
