// Lightweight auth for Academy students — NOT Supabase auth.
// Students log in with phone number + a short code issued after payment.
// Session = random token stored in academy_sessions, set as an httpOnly cookie.

import { randomBytes, randomInt, scrypt, scryptSync, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const SESSION_COOKIE = "academy_session";
const SESSION_DAYS = 90;

// 8 characters from an unambiguous alphabet (no 0/O/1/l/I) — readable over
// WhatsApp/phone but far harder to brute-force than a 6-digit numeric PIN
// (36^8 space vs 900,000 combinations).
const PASSWORD_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateStudentPassword(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

// Username = first name + 3 random digits, e.g. "Yusuf Abdi" -> "yusuf482".
// Not guaranteed unique by itself — caller retries with a fresh candidate on conflict.
export function generateUsername(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] || "student";
  const clean = firstName.toLowerCase().replace(/[^a-z0-9]/g, "") || "student";
  const digits = String(randomInt(1000)).padStart(3, "0");
  return `${clean}${digits}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)).toString("hex");
  return `${salt}:${hash}`;
}

// Fixed dummy hash (computed once, synchronously, at module load) used to run
// a real scrypt derivation even when a username doesn't exist — otherwise the
// "no such user" response returns near-instantly while a real-user-wrong-password
// response takes ~tens of ms for the scrypt call, letting an attacker enumerate
// valid usernames purely by timing the login endpoint.
const DUMMY_HASH = (() => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync("dummy-password-for-constant-time-login", salt, 64).toString("hex");
  return `${salt}:${hash}`;
})();

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

/** Runs a real scrypt derivation against a fixed dummy hash and always returns false — used to keep the "user not found" login path constant-time with the "wrong password" path. */
export async function verifyDummyPassword(password: string): Promise<false> {
  await verifyPassword(password, DUMMY_HASH);
  return false;
}

export { SESSION_COOKIE };

// Resolves the logged-in student from the session cookie, using the service
// role client (students aren't Supabase auth users, so RLS can't scope this).
export async function getStudentFromSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return null;

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: session } = await supabase
    .from("academy_sessions")
    .select("student_id, expires_at")
    .eq("token", token)
    .single();
  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: student } = await supabase
    .from("academy_students")
    .select("*, academy_tracks(id, name, age_range, total_weeks, weeks_per_payment)")
    .eq("id", session.student_id)
    .single();
  if (!student) return null;

  return { student, supabase };
}
