import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public track picker data — no auth needed. Same service-role pattern as /api/book.

export async function GET(req: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ownerUserId = process.env.OWNER_USER_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !ownerUserId || !supabaseUrl) {
      return NextResponse.json({ error: "Academy is not configured yet." }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: tracks, error } = await supabase
      .from("academy_tracks")
      .select("id, name, age_range, total_weeks, price_amount, price_currency")
      .eq("user_id", ownerUserId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Academy tracks fetch error:", error);
      return NextResponse.json({ error: "Could not load tracks. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ tracks: tracks || [] });
  } catch (err) {
    console.error("Academy tracks route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
