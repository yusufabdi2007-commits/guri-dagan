import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FrictionClient } from "@/components/friction/FrictionClient";

export default async function FrictionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <FrictionClient />;
}
