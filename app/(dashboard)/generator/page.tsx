import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { GeneratorClient } from "@/components/generator/GeneratorClient";

export default async function GeneratorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col min-h-full">
      <Header title="AI Generator" subtitle="Create content with AI" />
      <GeneratorClient />
    </div>
  );
}
