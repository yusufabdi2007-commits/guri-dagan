import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COUNTRIES } from "@/lib/countries";
import { matchCountry, getPrice, MIN_CHILD_AGE, type Track } from "@/lib/pricing";
import { getAdviceReply } from "@/lib/gemini";

// Gemini-driven WhatsApp intake bot. Public endpoint — Meta calls this
// directly, no auth. Requires:
//   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
//   SUPABASE_SERVICE_ROLE_KEY + OWNER_USER_ID (already used by /api/book)
//   GEMINI_API_KEY (for the advice reply)
// See HANDOFF.md "WhatsApp Bot" section for the full design + setup steps,
// including the external cron needed for delayed replies.

const GRAPH_URL = "https://graph.facebook.com/v20.0";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function sendWhatsAppMessage(to: string, payload: Record<string, unknown>) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("WhatsApp send skipped — missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
    return;
  }
  await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
  });
}

function sendText(to: string, body: string) {
  return sendWhatsAppMessage(to, { type: "text", text: { body } });
}

function trackButtonsPayload(bodyText: string) {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: [
          { type: "reply", reply: { id: "track_parent", title: "I want coaching" } },
          { type: "reply", reply: { id: "track_child", title: "My child needs it" } },
        ],
      },
    },
  };
}

/** Queue a message to send ~60-120s from now, instead of sending it immediately. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scheduleDelayedReply(
  supabase: any,
  phone: string,
  payload: Record<string, unknown>
) {
  const delaySeconds = 60 + Math.floor(Math.random() * 60);
  const sendAfter = new Date(Date.now() + delaySeconds * 1000).toISOString();
  await supabase.from("whatsapp_pending_replies").insert({
    phone_number: phone,
    payload,
    send_after: sendAfter,
  });
}

// ── GET: Meta webhook verification ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ── POST: incoming message webhook ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const change = body?.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return NextResponse.json({ ok: true }); // status update, not a message

    const from: string = message.from; // phone number, no "+"
    const supabase = admin();
    if (!supabase) {
      console.error("WhatsApp bot: Supabase service role not configured");
      return NextResponse.json({ ok: true });
    }

    const { data: existing } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", from)
      .maybeSingle();

    const session =
      existing ??
      { phone_number: from, step: "greeting", track: null, child_age: null, country: null, lead_id: null };

    const buttonId: string | undefined = message.interactive?.button_reply?.id;
    const text: string | undefined = message.text?.body;

    // ── GREETING: first message in — AI advice + delayed track-choice buttons ──
    if (session.step === "greeting") {
      const advice = await getAdviceReply(text ?? "");
      await scheduleDelayedReply(supabase, from, trackButtonsPayload(advice));
      await supabase
        .from("whatsapp_sessions")
        .upsert({ ...session, step: "awaiting_track", updated_at: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    // ── AWAITING TRACK: parent vs child ──
    if (session.step === "awaiting_track") {
      const track: Track | null = buttonId === "track_parent" ? "parent" : buttonId === "track_child" ? "child" : null;
      if (!track) {
        await sendWhatsAppMessage(from, trackButtonsPayload("Please tap one of the options below:"));
        return NextResponse.json({ ok: true });
      }
      if (track === "child") {
        await supabase
          .from("whatsapp_sessions")
          .upsert({ ...session, track, step: "awaiting_age", updated_at: new Date().toISOString() });
        await sendText(from, "How old is your child?");
      } else {
        await supabase
          .from("whatsapp_sessions")
          .upsert({ ...session, track, step: "awaiting_country", updated_at: new Date().toISOString() });
        await sendText(from, "Which country are you in? (please type the full name, e.g. Kenya, United Kingdom, United States)");
      }
      return NextResponse.json({ ok: true });
    }

    // ── AWAITING AGE (child track only) ──
    if (session.step === "awaiting_age") {
      const age = text ? parseInt(text.match(/\d+/)?.[0] ?? "", 10) : NaN;
      if (isNaN(age)) {
        await sendText(from, "Please reply with just the child's age in years (e.g. 9).");
        return NextResponse.json({ ok: true });
      }
      if (age < MIN_CHILD_AGE) {
        await supabase
          .from("whatsapp_sessions")
          .upsert({ ...session, child_age: age, step: "not_qualified", updated_at: new Date().toISOString() });
        await sendText(
          from,
          `Our child coaching program is designed for children ${MIN_CHILD_AGE} and older. For a younger child, parent coaching is the better fit — reply anytime if you'd like to explore that instead.`
        );
        return NextResponse.json({ ok: true });
      }
      await supabase
        .from("whatsapp_sessions")
        .upsert({ ...session, child_age: age, step: "awaiting_country", updated_at: new Date().toISOString() });
      await sendText(from, "Which country are you in? (please type the full name, e.g. Kenya, United Kingdom, United States)");
      return NextResponse.json({ ok: true });
    }

    // ── AWAITING COUNTRY — once answered, this is final; step moves on and is never revisited ──
    if (session.step === "awaiting_country") {
      const matched = text ? matchCountry(text, COUNTRIES) : null;
      if (!matched) {
        await sendText(from, "Sorry, I didn't recognize that country — please type the full name (e.g. Somalia, Kenya, United Kingdom).");
        return NextResponse.json({ ok: true });
      }

      const track = (session.track ?? "parent") as Track;
      const quote = getPrice(matched, track);
      const ownerUserId = process.env.OWNER_USER_ID;
      let leadId: string | null = null;

      if (ownerUserId) {
        const { data: lead } = await supabase
          .from("leads")
          .insert({
            user_id: ownerUserId,
            name: `WhatsApp +${from}`,
            phone: from,
            source: "whatsapp",
            stage: "new_lead",
            country: matched,
            notes: `Track: ${track}${session.child_age ? ` (child age ${session.child_age})` : ""}. Auto-quoted $${quote.monthlyPrice}/month via bot.`,
          })
          .select("id")
          .single();
        leadId = lead?.id ?? null;
      }

      await supabase.from("whatsapp_sessions").upsert({
        ...session,
        country: matched,
        lead_id: leadId,
        step: "done",
        updated_at: new Date().toISOString(),
      });

      const nextSteps =
        track === "parent"
          ? "Before we start, Coach Rahma first gets to know your situation and habits — like a coach assessing you before building a plan — then designs your plan around that."
          : "Your child follows a structured program with clear steps from week to week.";

      const paymentInfo = process.env.PAYMENT_INFO_TEXT || "Coach Rahma will share payment details with you directly.";

      await sendText(
        from,
        `For ${matched}, this is $${quote.monthlyPrice}/month (${quote.cadence}).\n\n` +
          `${nextSteps}\n\n` +
          `Payment: ${paymentInfo}\n\n` +
          `Feel free to share more about your situation here — Coach Rahma will follow up with you personally.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── DONE / NOT_QUALIFIED — bot's job is finished, log further messages for a human ──
    if (session.lead_id) {
      await supabase.from("lead_activity").insert({
        lead_id: session.lead_id,
        user_id: process.env.OWNER_USER_ID,
        activity_type: "note_added",
        note: `WhatsApp: ${text ?? "[non-text message]"}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ ok: true }); // always 200 so Meta doesn't retry-storm
  }
}
