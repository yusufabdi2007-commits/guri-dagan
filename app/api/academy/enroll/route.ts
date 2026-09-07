import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

// Public enrollment — no auth, no password collected here.
// Creates a "pending_payment" student row. Credentials are issued later,
// only once mom marks the student as paid (see /api/academy/admin/students/[id]).

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ownerUserId = process.env.OWNER_USER_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !ownerUserId || !supabaseUrl) {
      return NextResponse.json({ error: "Academy is not configured yet. Please contact us directly." }, { status: 503 });
    }

    let body: { name?: string; phone?: string; country?: string; track_id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { name, phone, country, track_id } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    if (!country?.trim()) return NextResponse.json({ error: "Please select the country you're currently in" }, { status: 400 });
    if (!track_id) return NextResponse.json({ error: "Please choose a track" }, { status: 400 });

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: track } = await supabase
      .from("academy_tracks")
      .select("id, name, age_range")
      .eq("id", track_id)
      .eq("user_id", ownerUserId)
      .eq("is_active", true)
      .single();
    if (!track) return NextResponse.json({ error: "That track is not available." }, { status: 404 });

    const { data: student, error } = await supabase
      .from("academy_students")
      .insert({
        user_id: ownerUserId,
        track_id,
        name: name.trim(),
        phone: phone.trim(),
        country: country.trim(),
        status: "pending_payment",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "This name and phone number are already registered for this track. We'll be in touch about payment." }, { status: 409 });
      }
      console.error("Academy enroll insert error:", error);
      return NextResponse.json({ error: "Could not register. Please try again." }, { status: 500 });
    }

    // Awaited (not fire-and-forget): on Vercel's serverless functions, work
    // left running after the response is sent can be killed mid-flight once
    // the function tears down — the same failure mode already documented for
    // the WhatsApp bot's delayed replies elsewhere in this codebase. The send
    // itself only adds a few hundred ms, so it's cheap to wait for.
    await notifyAdminOfEnrollment({ name: student.name, phone: student.phone, country: student.country, trackName: track.name, ageRange: track.age_range });

    return NextResponse.json({ student: { id: student.id, name: student.name, status: student.status } }, { status: 201 });
  } catch (err) {
    console.error("Academy enroll route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// A registration has already succeeded by the time this runs, so an email
// failure here must never turn into a failed enrollment response — it's only
// ever logged. Same Resend pattern (and same "only delivers to the account
// owner" constraint) as /api/contact.
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

/** Strips line breaks/control chars and caps length — for values placed in an email subject line. */
function sanitizeForSubject(value: unknown, maxLen = 100): string {
  return String(value ?? "").replace(/[\r\n\t\x00-\x1f]/g, " ").trim().slice(0, maxLen);
}

async function notifyAdminOfEnrollment(student: { name: string; phone: string; country: string; trackName: string; ageRange: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const safeName = escapeHtml(student.name);
  const safePhone = escapeHtml(student.phone);
  const safeCountry = escapeHtml(student.country);
  const safeTrack = escapeHtml(student.trackName);
  const safeAgeRange = escapeHtml(student.ageRange);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#4a1a8a,#7c3bb5);padding:24px 28px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;">New Academy Registration</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Awaiting payment</p>
      </div>
      <div style="background:#f9f6ff;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e8e0ff;border-top:none;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;width:140px;">Name</td>
            <td style="padding:8px 0;font-size:14px;font-weight:700;color:#1a1a1a;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">WhatsApp</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${safePhone}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">Country</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${safeCountry}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888;">Track</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${safeTrack} (${safeAgeRange})</td>
          </tr>
        </table>
        <div style="margin-top:18px;text-align:center;">
          <a href="https://wa.me/${student.phone.replace(/[^0-9]/g, "")}"
             style="display:inline-block;background:#5b2da0;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
            Message on WhatsApp
          </a>
        </div>
        <p style="margin-top:16px;font-size:12px;color:#999;text-align:center;">Mark them paid in the Academy admin panel once payment comes through.</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Guri Dagan Academy <onboarding@resend.dev>",
        to: ["ymo441993@gmail.com"],
        subject: `New Academy registration — ${sanitizeForSubject(student.name)} (${sanitizeForSubject(student.trackName)})`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[academy enroll] Resend rejected the notification:", await res.text());
      return;
    }
    const data = await res.json();
    console.log("[academy enroll] Notification email accepted by Resend, id:", data?.id);
  } catch (e) {
    console.error("[academy enroll] notification email failed:", e);
  }
}
