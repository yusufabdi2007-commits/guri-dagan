import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

// Rotating daily messages — one per day of week
const DAILY_MESSAGES = [
  { title: "Your content is ready", body: "See today's post, record your script, and get it live." },
  { title: "Monday — start the week strong", body: "Your weekly plan is live. Tap to see today's post." },
  { title: "Tuesday posting day", body: "Your TikTok script is ready. One post, one step forward." },
  { title: "Keep the momentum going", body: "Your audience is growing. Today's content is waiting for you." },
  { title: "Thursday — stay consistent", body: "Consistency builds trust. Tap to post today's content." },
  { title: "Friday post is ready", body: "End the week strong. Your script is ready to record." },
  { title: "Weekend content day", body: "Your Sunday posts reach parents when they're most present. Tap to start." },
];

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://guri-dagan.vercel.app";

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 503 });
  }

  webpush.setVapidDetails(
    `mailto:notifications@${new URL(appUrl).hostname}`,
    vapidPublic,
    vapidPrivate
  );

  // Service role client — bypasses RLS to read all subscriptions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error("Failed to fetch push subscriptions:", error);
    return NextResponse.json({ error: "Could not fetch subscriptions" }, { status: 500 });
  }

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, message: "No subscriptions to notify" });
  }

  // Pick message based on day of week (0=Sun, 1=Mon, ...)
  const dayIndex = new Date().getDay();
  const message = DAILY_MESSAGES[dayIndex];

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: message.title,
          body: message.body,
          url: "/today",
        })
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      console.error("Push send error:", err);
      // Remove expired or invalid subscriptions (HTTP 410 Gone)
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  console.log(`Push notifications sent: ${sent}, failed: ${failed}`);
  return NextResponse.json({ sent, failed, total: subscriptions.length });
}
