import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ProgramKnowledgeClient } from "@/components/program-knowledge/ProgramKnowledgeClient";

export default async function ProgramKnowledgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("program_knowledge")
    .select("id, program_name, file_name, char_count, indexed_at")
    .eq("user_id", user.id)
    .order("program_name");

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Program Knowledge"
        subtitle="Upload curriculum PDFs — AI learns from the actual material"
      />
      <ProgramKnowledgeClient initialEntries={entries ?? []} />
    </div>
  );
}
