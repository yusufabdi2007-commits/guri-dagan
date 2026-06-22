import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SystemHealthClient } from "@/components/system-health/SystemHealthClient";

export default async function SystemHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <Header title="System Health" subtitle="Diagnostics dashboard" />
      <div className="max-w-4xl mx-auto px-4 pb-24 pt-6">
        <SystemHealthClient />
      </div>
    </div>
  );
}
