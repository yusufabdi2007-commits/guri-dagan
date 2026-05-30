import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

// Public booking intake — no auth needed.
// Requires SUPABASE_SERVICE_ROLE_KEY + OWNER_USER_ID in env vars.
// OWNER_USER_ID = the coach's Supabase user ID (find in Supabase → Auth → Users).

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: "Too many booking requests. Please wait before trying again." }, { status: 429 });

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ownerUserId = process.env.OWNER_USER_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !ownerUserId || !supabaseUrl) {
      return NextResponse.json(
        { error: "Booking is not configured yet. Please contact us directly." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { client_name, email, phone, package_name, message, source } = body;

    if (!client_name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Use service role to bypass RLS — insert on behalf of the coach
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.from("booking_requests").insert({
      user_id: ownerUserId,
      client_name: client_name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      package_name: package_name?.trim() || null,
      message: message?.trim() || null,
      source: source || "Website",
      status: "New",
    });

    if (error) {
      console.error("Booking insert error:", error);
      return NextResponse.json({ error: "Could not submit booking. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Book route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
