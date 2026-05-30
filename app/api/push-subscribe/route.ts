import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Save a push subscription for the current user.
// Called from the browser after the user grants notification permission.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    // Upsert — same device can re-subscribe without creating duplicates
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("Push subscribe error:", error);
      return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscribe route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { endpoint } = await req.json();
    await supabase.from("push_subscriptions").delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
