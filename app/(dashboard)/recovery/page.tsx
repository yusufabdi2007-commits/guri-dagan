import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { RecoveryClient } from "@/components/recovery/RecoveryClient";

export default async function RecoveryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <Header title="Recovery Center" subtitle="One-click repair tools" />
      <div className="max-w-4xl mx-auto px-4 pb-24 pt-6">
        <RecoveryClient />
      </div>
    </div>
  );
}
