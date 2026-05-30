import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { RepurposeClient } from "@/components/repurpose/RepurposeClient";

export default async function RepurposePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: history } = await supabase
    .from("repurposed_assets")
    .select("id, source_title, asset_count, created_at, assets")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Repurpose Engine"
        subtitle="1 video → 10+ assets across all platforms"
      />
      <RepurposeClient history={history || []} userId={user!.id} />
    </div>
  );
}
