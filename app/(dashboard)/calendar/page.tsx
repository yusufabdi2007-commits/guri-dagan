import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get date range: 2 weeks back to 2 weeks forward
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const to = new Date();
  to.setDate(to.getDate() + 14);

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  const [{ data: items }, { data: ideas }, { data: batchPosts }] = await Promise.all([
    supabase
      .from("calendar_items")
      .select("*")
      .eq("user_id", user!.id)
      .gte("scheduled_date", from.toISOString())
      .lte("scheduled_date", to.toISOString())
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("content_ideas")
      .select("id, title, platform, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("batch_posts")
      .select("id, scheduled_date, platform, title, status, angle_notes")
      .eq("user_id", user!.id)
      .gte("scheduled_date", fromStr)
      .lte("scheduled_date", toStr)
      .order("scheduled_date", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Content Calendar" subtitle="Plan your posting schedule" />
      <CalendarClient items={items || []} ideas={ideas || []} userId={user!.id} batchPosts={batchPosts || []} />
    </div>
  );
}
