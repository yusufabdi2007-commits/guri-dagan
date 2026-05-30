import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get date range: 2 weeks back to 2 weeks forward
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const to = new Date();
  to.setDate(to.getDate() + 14);

  const { data: items } = await supabase
    .from("calendar_items")
    .select("*")
    .eq("user_id", user!.id)
    .gte("scheduled_date", from.toISOString())
    .lte("scheduled_date", to.toISOString())
    .order("scheduled_date", { ascending: true });

  const { data: ideas } = await supabase
    .from("content_ideas")
    .select("id, title, platform, status")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Content Calendar" subtitle="Plan your posting schedule" />
      <CalendarClient items={items || []} ideas={ideas || []} userId={user!.id} />
    </div>
  );
}
