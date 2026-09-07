import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStudentPassword, generateUsername, hashPassword } from "@/lib/academy-auth";

// PATCH handles three things:
// 1. Plain field updates (current_week, status) — manual admin correction only.
// 2. action: "mark_paid" — the FIRST payment. Issues login credentials (username
//    + password, shown once in plaintext) and unlocks the first block of weeks
//    (track.weeks_per_payment, e.g. 4) all at once — not one week at a time.
// 3. action: "record_payment" — a RENEWAL payment for a student who already has
//    credentials. Unlocks the next block of weeks, logs the payment, but does
//    NOT touch their existing username/password.
// "reissue_credentials" regenerates a lost password only — no week/payment change.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: student } = await supabase
      .from("academy_students")
      .select("*, academy_tracks(price_amount, price_currency, total_weeks, weeks_per_payment)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const track = student.academy_tracks as
      | { price_amount: number; price_currency: string; total_weeks: number; weeks_per_payment: number }
      | null;

    const body = await req.json();
    const { action, current_week, status } = body;

    if (action === "record_payment") {
      if (!student.username || !student.password_hash) {
        return NextResponse.json({ error: "This student doesn't have login credentials yet — use Mark Paid first." }, { status: 400 });
      }
      const weeksPerPayment = track?.weeks_per_payment ?? 4;
      const totalWeeks = track?.total_weeks ?? 999;
      const nextWeek = Math.min(student.current_week + weeksPerPayment, totalWeeks);

      const { data: updated, error } = await supabase
        .from("academy_students")
        .update({
          current_week: nextWeek,
          status: nextWeek >= totalWeeks ? "completed" : "active",
          last_payment_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase.from("academy_payments").insert({
        user_id: user.id,
        student_id: id,
        track_id: student.track_id,
        amount: track?.price_amount ?? 0,
        currency: track?.price_currency ?? "USD",
      });

      return NextResponse.json({ student: updated });
    }

    if (action === "mark_paid" || action === "reissue_credentials") {
      const plainPassword = generateStudentPassword();
      const password_hash = await hashPassword(plainPassword);

      const updates: Record<string, unknown> = {
        password_hash,
        credentials_issued_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      };
      if (action === "mark_paid") {
        const weeksPerPayment = track?.weeks_per_payment ?? 4;
        const totalWeeks = track?.total_weeks ?? 999;
        updates.status = "active";
        updates.paid_at = new Date().toISOString();
        updates.last_payment_at = new Date().toISOString();
        updates.current_week = Math.min(weeksPerPayment, totalWeeks);
      }

      // Username is only regenerated the first time credentials are issued —
      // re-issuing a lost password keeps the same username the student already knows.
      let username = student.username;
      let updated, error;
      if (username) {
        ({ data: updated, error } = await supabase.from("academy_students").update(updates).eq("id", id).select().single());
      } else {
        for (let attempt = 0; attempt < 5 && !updated; attempt++) {
          username = generateUsername(student.name);
          ({ data: updated, error } = await supabase
            .from("academy_students")
            .update({ ...updates, username })
            .eq("id", id)
            .select()
            .single());
          if (error?.code !== "23505") break; // only retry on a username collision
        }
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (action === "mark_paid") {
        await supabase.from("academy_payments").insert({
          user_id: user.id,
          student_id: id,
          track_id: student.track_id,
          amount: track?.price_amount ?? 0,
          currency: track?.price_currency ?? "USD",
        });
      }

      return NextResponse.json({ student: updated, credentials: { username, password: plainPassword } });
    }

    const updates: Record<string, unknown> = {};
    if (current_week !== undefined) updates.current_week = current_week;
    if (status !== undefined) updates.status = status;

    const { data: updated, error } = await supabase
      .from("academy_students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Revoke any existing session when a student is cancelled or reverted to
    // pending payment — otherwise a previously-issued cookie keeps granting
    // access for up to 90 days after the coach revokes them. ("completed" is
    // left alone — a finished student should still be able to review material.)
    if (status === "cancelled" || status === "pending_payment") {
      await supabase.from("academy_sessions").delete().eq("student_id", id);
    }

    return NextResponse.json({ student: updated });
  } catch (err) {
    console.error("Academy student PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("academy_students").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Academy student DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
