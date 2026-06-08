import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TestimonialsClient } from "@/components/testimonials/TestimonialsClient";

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Testimonials" subtitle="Social proof from your community" />
      <TestimonialsClient testimonials={testimonials || []} userId={user!.id} />
    </div>
  );
}
