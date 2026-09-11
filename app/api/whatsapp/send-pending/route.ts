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
  if (!secret || auth !== `Bearer ${secret}`) {
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

  // Find candidate rows first (read-only — just to know which ids to try
  // claiming; a plain SELECT here is fine since nothing is decided yet).
  const { data: candidates, error: selectError } = await supabase
    .from("whatsapp_pending_replies")
    .select("id")
    .eq("sent", false)
    .lte("send_after", new Date().toISOString())
    .limit(50);

  if (selectError) {
    console.error("send-pending fetch error:", selectError);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
  const candidateIds = (candidates ?? []).map((r) => r.id);
  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, checked: 0 });
  }

  // Atomically claim rows by flipping sent=false -> true in one UPDATE
  // scoped to still-unsent rows, and only send for the rows this specific
  // request actually won the claim on (via .select() returning the rows the
  // UPDATE touched). Previously this read rows, sent them, then marked
  // sent=true as a separate step — if two cron invocations overlapped (a
  // manual re-trigger, or one run exceeding the 1-minute interval), both
  // could read the same row before either marked it sent, sending the same
  // WhatsApp message to the user twice.
  const { data: claimed, error: claimError } = await supabase
    .from("whatsapp_pending_replies")
    .update({ sent: true })
    .in("id", candidateIds)
    .eq("sent", false)
    .select("id, phone_number, payload");

  if (claimError) {
    console.error("send-pending claim error:", claimError);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }

  let sentCount = 0;
  for (const row of claimed ?? []) {
    try {
      await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", to: row.phone_number, ...(row.payload as object) }),
      });
      sentCount++;
    } catch (err) {
      // Already claimed (sent=true) — deliberately not reset to retry, to
      // favor "at most once" (never a duplicate message to the user) over
      // "at least once" for this user-facing send.
      console.error("send-pending send error for", row.id, err);
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount, checked: claimed?.length ?? 0 });
}
