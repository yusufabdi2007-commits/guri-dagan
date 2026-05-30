import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { PackagesClient } from "@/components/packages/PackagesClient";

export default async function PackagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: packages }, { data: bookings }] = await Promise.all([
    supabase
      .from("coaching_packages")
      .select("*")
      .eq("user_id", user!.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("booking_requests")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Coaching Packages" subtitle="Manage your offers and client inquiries" />
      <PackagesClient
        packages={packages || []}
        bookings={bookings || []}
        userId={user!.id}
      />
    </div>
  );
}
