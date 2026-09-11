import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CalendarClient } from "@/components/calendar/CalendarClient";

// Same timezone this app uses everywhere else (see today/page.tsx) — this
// page previously anchored its date range to the server's UTC day via plain
// Date/toISOString(), while /today anchors to this local timezone. Near
// midnight UK time (e.g. 00:30 BST = 23:30 UTC the PREVIOUS day on the
// server), the two screens could disagree by a day about what "today" even
// is, so a post /today already shows as today's could sit right at/outside
// this page's date-range boundary.
const TZ = process.env.USER_TIMEZONE || "Europe/London";

function toLocalDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get date range: 2 weeks back to 2 weeks forward, anchored to local "today"
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 14);
  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  const fromStr = toLocalDate(from);
  const toStr = toLocalDate(to);

  // calendar_items.scheduled_date is timestamptz (unlike batch_posts, which
  // is a plain `date` column) — comparing it against a bare "YYYY-MM-DD"
  // string has Postgres interpret that as UTC midnight, which would just
  // relocate the same local-vs-UTC boundary bug rather than fix it. Pad by
  // a full day on each side instead, in real UTC instants, so the local
  // timezone's day boundary is always safely inside the queried range.
  const fromInstant = new Date(from);
  fromInstant.setDate(fromInstant.getDate() - 1);
  const toInstant = new Date(to);
  toInstant.setDate(toInstant.getDate() + 1);

  const [{ data: items }, { data: ideas }, { data: batchPosts }] = await Promise.all([
    supabase
      .from("calendar_items")
      .select("*")
      .eq("user_id", user!.id)
      .gte("scheduled_date", fromInstant.toISOString())
      .lte("scheduled_date", toInstant.toISOString())
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
