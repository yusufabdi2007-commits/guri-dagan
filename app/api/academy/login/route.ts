import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import {
  verifyPassword,
  verifyDummyPassword,
  generateSessionToken,
  sessionExpiry,
  SESSION_COOKIE,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES,
} from "@/lib/academy-auth";

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 15 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Academy is not configured yet." }, { status: 503 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { username, password } = body;
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Enter your username and password" }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");

    const { data: student } = await supabase
      .from("academy_students")
      .select("id, password_hash, status, failed_login_attempts, locked_until")
      .eq("username", cleanUsername)
      .single();

    if (!student) {
      // Run a real scrypt derivation anyway so this response takes the same
      // time as a "wrong password" response — otherwise username existence
      // is discoverable by timing the login endpoint.
      await verifyDummyPassword(password.trim().toUpperCase());
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    if (student.locked_until && new Date(student.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(student.locked_until).getTime() - Date.now()) / 60_000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` },
        { status: 423 }
      );
    }

    const passwordOk = student.password_hash && (await verifyPassword(password.trim().toUpperCase(), student.password_hash));

    if (!passwordOk) {
      const attempts = (student.failed_login_attempts || 0) + 1;
      const updates: Record<string, unknown> = { failed_login_attempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updates.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      }
      await supabase.from("academy_students").update(updates).eq("id", student.id);
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    await supabase
      .from("academy_students")
      .update({ failed_login_attempts: 0, locked_until: null })
      .eq("id", student.id);

    const token = generateSessionToken();
    const expires_at = sessionExpiry();

    const { error: sessionError } = await supabase
      .from("academy_sessions")
      .insert({ token, student_id: student.id, expires_at: expires_at.toISOString() });
    if (sessionError) return NextResponse.json({ error: "Could not log in. Please try again." }, { status: 500 });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expires_at,
    });
    return res;
  } catch (err) {
    console.error("Academy login error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (token && serviceKey && supabaseUrl) {
    const supabase = createClient(supabaseUrl, serviceKey);
    await supabase.from("academy_sessions").delete().eq("token", token);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
