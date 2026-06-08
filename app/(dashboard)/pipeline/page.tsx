import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PipelineClient } from "@/components/pipeline/PipelineClient";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Content Pipeline"
        subtitle="One recording → full content suite"
      />
      <PipelineClient userId={user!.id} />
    </div>
  );
}
