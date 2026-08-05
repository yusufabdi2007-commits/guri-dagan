import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sends any due, unsent WhatsApp replies from whatsapp_pending_replies.
// This exists because the bot deliberately delays its first reply ~60-120s
// so it doesn't feel instant/robotic — but Vercel's free cron tier only
// runs once a day, far too infrequent for this. Trigger this route instead
// from a free external cron (e.g. cron-job.org) every 1 minute, hitting:
//   https://guri-dagan.vercel.app/api/whatsapp/send-pending
// with header: Authorization: Bearer <CRON_SECRET>
// See HANDOFF.md "WhatsApp Bot" section.

const GRAPH_URL = "https://graph.facebook.com/v20.0";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!url || !key || !token || !phoneNumberId) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { data: due, error } = await supabase
    .from("whatsapp_pending_replies")
    .select("id, phone_number, payload")
    .eq("sent", false)
    .lte("send_after", new Date().toISOString())
    .limit(50);

  if (error) {
    console.error("send-pending fetch error:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }

  let sentCount = 0;
  for (const row of due ?? []) {
    try {
      await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", to: row.phone_number, ...(row.payload as object) }),
      });
      await supabase.from("whatsapp_pending_replies").update({ sent: true }).eq("id", row.id);
      sentCount++;
    } catch (err) {
      console.error("send-pending send error for", row.id, err);
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount, checked: due?.length ?? 0 });
}
