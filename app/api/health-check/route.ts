import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TZ = process.env.USER_TIMEZONE || "Europe/London";

function toLocalDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

function getWeekStart(todayStr: string): string {
  const noon = new Date(todayStr + "T12:00:00");
  const dow = noon.getDay();
  const daysBack = (dow + 6) % 7;
  noon.setDate(noon.getDate() - daysBack);
  return toLocalDate(noon);
}

type CheckStatus = "healthy" | "warning" | "critical";

export interface HealthCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  detail?: string;
}

export interface HealthReport {
  overall: CheckStatus;
  checks: HealthCheck[];
  groups: { label: string; checks: HealthCheck[] }[];
  meta: { todayStr: string; weekStart: string; nextWeekStart: string; checkedAt: string; latencyMs: number };
}

export async function GET() {
  const t0 = Date.now();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = toLocalDate(new Date());
  const weekStart = getWeekStart(todayStr);
  const weekEnd = addDays(weekStart, 6);
  const nextWeekStart = addDays(weekStart, 7);
  const tomorrowStr = addDays(todayStr, 1);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const checks: HealthCheck[] = [];

  function ok(id: string, label: string, message: string): void {
    checks.push({ id, label, status: "healthy", message });
  }
  function warn(id: string, label: string, message: string, detail?: string): void {
    checks.push({ id, label, status: "warning", message, ...(detail ? { detail } : {}) });
  }
  function crit(id: string, label: string, message: string, detail?: string): void {
    checks.push({ id, label, status: "critical", message, ...(detail ? { detail } : {}) });
  }

  // ─── CORE INFRASTRUCTURE ────────────────────────────────────────────────────

  // Auth
  ok("auth", "Authentication", `Signed in as ${user.email}`);

  // DB latency
  const dbT0 = Date.now();
  await supabase.from("weekly_batches").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const dbLatency = Date.now() - dbT0;
  if (dbLatency < 500) {
    ok("db_latency", "Database Latency", `${dbLatency}ms — fast`);
  } else if (dbLatency < 2000) {
    warn("db_latency", "Database Latency", `${dbLatency}ms — slightly slow`);
  } else {
    crit("db_latency", "Database Latency", `${dbLatency}ms — database is responding slowly`);
  }

  // Env vars
  const missingEnv: string[] = [];
  if (!process.env.GROQ_API_KEY) missingEnv.push("GROQ_API_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingEnv.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missingEnv.length === 0) {
    ok("env_vars", "Environment Variables", "All required environment variables are set");
  } else {
    crit("env_vars", "Environment Variables", `Missing: ${missingEnv.join(", ")}`, "Set these in Vercel Dashboard → Settings → Environment Variables");
  }

  // AI Provider
  if (process.env.GROQ_API_KEY) {
    ok("ai_provider", "AI Provider (Groq)", "GROQ_API_KEY is configured — script generation available");
  } else {
    crit("ai_provider", "AI Provider (Groq)", "GROQ_API_KEY is not set — AI script generation will fail");
  }

  // Timezone
  const tzVal = process.env.USER_TIMEZONE;
  if (tzVal === "Africa/Cairo") {
    ok("timezone", "Timezone", `Correctly set to Africa/Cairo — today is ${todayStr}`);
  } else if (!tzVal) {
    warn("timezone", "Timezone", `USER_TIMEZONE not set — defaulting to Europe/London. Set USER_TIMEZONE=Africa/Cairo in Vercel.`);
  } else {
    ok("timezone", "Timezone", `USER_TIMEZONE=${tzVal} — today is ${todayStr}`);
  }

  // ─── PARALLEL BATCH / POST DATA FETCH ──────────────────────────────────────

  const [
    { data: batch },
    { data: nextBatch },
    { data: allPosts },
    { data: completions },
    { data: knowledgeItems },
  ] = await Promise.all([
    supabase.from("weekly_batches").select("id, week_start, status, theme").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
    supabase.from("weekly_batches").select("id, week_start").eq("user_id", user.id).eq("week_start", nextWeekStart).maybeSingle(),
    supabase.from("batch_posts").select("id, platform, scheduled_date, sort_order, status, batch_id, title").eq("user_id", user.id).gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd),
    supabase.from("daily_completions").select("completed_date").eq("user_id", user.id).gte("completed_date", weekStart).lte("completed_date", weekEnd),
    supabase.from("program_knowledge").select("program_name, char_count").eq("user_id", user.id),
  ]);

  const posts = allPosts || [];

  // ─── THIS WEEK SCHEDULE ─────────────────────────────────────────────────────

  if (!batch) {
    crit("current_batch", "Current Week Batch", `No batch found for week starting ${weekStart}. Go to /batch/plan to generate one.`);
  } else {
    ok("current_batch", "Current Week Batch", `Batch exists for ${weekStart} — "${batch.theme || "no theme set"}"`);
  }

  if (!nextBatch) {
    warn("next_batch", "Next Week Batch", `No batch planned for next week (${nextWeekStart}). Run weekly assignment on Sunday to plan ahead.`);
  } else {
    ok("next_batch", "Next Week Batch", `Next week batch exists (${nextWeekStart})`);
  }

  if (!batch) {
    // Remaining post checks blocked
    const blockedChecks: [string, string][] = [
      ["tiktok_count", "TikTok Post Count"],
      ["youtube_count", "YouTube Post Count"],
      ["todays_tiktok", "Today's TikTok"],
      ["tomorrow_post", "Tomorrow's Post"],
      ["duplicate_dates", "Duplicate Dates"],
      ["week_dates", "Date Integrity"],
      ["sort_order", "Sort Order"],
      ["week_start_match", "Week Start Accuracy"],
      ["orphaned_posts", "Orphaned Posts"],
    ];
    blockedChecks.forEach(([id, label]) =>
      crit(id, label, "Cannot check — no batch exists for this week")
    );
  } else {
    const tiktokPosts = posts.filter(p => p.platform === "TikTok");
    const youtubePosts = posts.filter(p => p.platform === "YouTube");

    // TikTok count
    if (tiktokPosts.length === 7) {
      ok("tiktok_count", "TikTok Post Count", "7 TikTok posts scheduled");
    } else {
      crit("tiktok_count", "TikTok Post Count", `Expected 7 TikTok posts, found ${tiktokPosts.length}. Run Recovery → Repair Missing Posts.`);
    }

    // YouTube count
    if (youtubePosts.length === 1) {
      ok("youtube_count", "YouTube Post Count", "1 YouTube post scheduled (Wednesday)");
    } else if (youtubePosts.length === 0) {
      crit("youtube_count", "YouTube Post Count", "No YouTube post scheduled. Run Recovery → Repair Missing Posts.");
    } else {
      warn("youtube_count", "YouTube Post Count", `${youtubePosts.length} YouTube posts found — expected exactly 1`);
    }

    // Today's TikTok
    const todayTikTok = tiktokPosts.find(p => p.scheduled_date === todayStr);
    if (todayTikTok) {
      ok("todays_tiktok", "Today's TikTok", `"${todayTikTok.title || "untitled"}" — ready to post`);
    } else {
      crit("todays_tiktok", "Today's TikTok", `No TikTok found for today (${todayStr}). Check date integrity.`);
    }

    // Tomorrow's post
    const isLastDayOfWeek = todayStr === weekEnd;
    const tomorrowPost = posts.find(p => p.scheduled_date === tomorrowStr);
    if (isLastDayOfWeek) {
      if (nextBatch) {
        ok("tomorrow_post", "Tomorrow's Post", "Today is Sunday — next week's batch is ready");
      } else {
        warn("tomorrow_post", "Tomorrow's Post", "Today is Sunday — no next week batch planned yet");
      }
    } else if (tomorrowPost) {
      ok("tomorrow_post", "Tomorrow's Post", `"${tomorrowPost.title || tomorrowPost.platform}" scheduled for tomorrow (${tomorrowStr})`);
    } else {
      warn("tomorrow_post", "Tomorrow's Post", `No post found for tomorrow (${tomorrowStr})`);
    }

    // Duplicate dates
    const tiktokDates = tiktokPosts.map(p => p.scheduled_date);
    const uniqueTiktokDates = new Set(tiktokDates);
    if (uniqueTiktokDates.size < tiktokDates.length) {
      const dups = tiktokDates.filter((d, i) => tiktokDates.indexOf(d) !== i);
      crit("duplicate_dates", "Duplicate Dates", `TikTok has duplicate scheduled dates: ${[...new Set(dups)].join(", ")}`);
    } else {
      ok("duplicate_dates", "Duplicate Dates", "No duplicate scheduled dates");
    }

    // Date integrity
    const wrongDates = posts.filter(p => !weekDates.includes(p.scheduled_date));
    if (wrongDates.length > 0) {
      crit(
        "week_dates",
        "Date Integrity",
        `${wrongDates.length} posts have dates outside the expected week (${weekStart}–${weekEnd})`,
        wrongDates.map(p => `${p.platform}: ${p.scheduled_date}`).join(", ")
      );
    } else {
      ok("week_dates", "Date Integrity", `All ${posts.length} post dates are within the correct week`);
    }

    // Sort order
    const noSortOrder = posts.filter(p => p.sort_order == null);
    if (noSortOrder.length > 0) {
      warn("sort_order", "Sort Order", `${noSortOrder.length} posts missing sort_order — display order may be wrong. Run Recovery → Fix Sort Order.`);
    } else {
      ok("sort_order", "Sort Order", "All posts have sort_order set");
    }

    // Week start accuracy
    if (batch.week_start !== weekStart) {
      crit("week_start_match", "Week Start Accuracy", `Batch week_start (${batch.week_start}) doesn't match expected Monday (${weekStart})`);
    } else {
      ok("week_start_match", "Week Start Accuracy", `week_start correctly set to Monday ${weekStart}`);
    }

    // Orphaned posts
    const orphaned = posts.filter(p => p.batch_id !== batch.id);
    if (orphaned.length > 0) {
      warn("orphaned_posts", "Orphaned Posts", `${orphaned.length} posts in this week's date range belong to a different batch`);
    } else {
      ok("orphaned_posts", "Orphaned Posts", "No orphaned batch_posts");
    }
  }

  // ─── HISTORY & PROGRESS ─────────────────────────────────────────────────────

  const postedThisWeek = posts.filter(p => p.status === "posted").length;
  const completionCount = completions?.length || 0;
  ok("progress_totals", "Progress Totals", `${postedThisWeek}/${posts.length} posts marked as posted; ${completionCount} completion records this week`);

  // ─── PROGRAM KNOWLEDGE ──────────────────────────────────────────────────────

  const ALL_PROGRAMS = ["MePower™", "Inner Power™", "MindPower™", "DreamPower™", "Slaying Dragons™"];
  const knownPrograms = new Set((knowledgeItems || []).map(k => k.program_name));
  const missingPrograms = ALL_PROGRAMS.filter(p => !knownPrograms.has(p));
  const lowQuality = (knowledgeItems || []).filter(k => k.char_count < 500);

  if (knownPrograms.size === 0) {
    warn("program_knowledge", "Program Knowledge", "No curriculum uploaded yet. Scripts use built-in fallback content. Upload PDFs at /program-knowledge.");
  } else if (missingPrograms.length > 0) {
    warn("program_knowledge", "Program Knowledge", `${knownPrograms.size}/5 programs have curriculum. Missing: ${missingPrograms.join(", ")}`);
  } else if (lowQuality.length > 0) {
    warn("program_knowledge", "Program Knowledge", `${lowQuality.length} program(s) have very little text extracted — consider re-uploading`, lowQuality.map(k => k.program_name).join(", "));
  } else {
    ok("program_knowledge", "Program Knowledge", `All 5 programs have curriculum uploaded`);
  }

  // ─── BUILD GROUPS ───────────────────────────────────────────────────────────

  const groups = [
    {
      label: "Core Infrastructure",
      checks: checks.filter(c => ["auth", "db_latency", "env_vars", "ai_provider", "timezone"].includes(c.id)),
    },
    {
      label: "This Week's Schedule",
      checks: checks.filter(c => ["current_batch", "next_batch", "tiktok_count", "youtube_count"].includes(c.id)),
    },
    {
      label: "Today & Tomorrow",
      checks: checks.filter(c => ["todays_tiktok", "tomorrow_post"].includes(c.id)),
    },
    {
      label: "Post Integrity",
      checks: checks.filter(c => ["duplicate_dates", "week_dates", "sort_order", "week_start_match", "orphaned_posts"].includes(c.id)),
    },
    {
      label: "History & Progress",
      checks: checks.filter(c => ["progress_totals"].includes(c.id)),
    },
    {
      label: "Program Knowledge",
      checks: checks.filter(c => ["program_knowledge"].includes(c.id)),
    },
  ];

  const overall: CheckStatus = checks.some(c => c.status === "critical") ? "critical"
    : checks.some(c => c.status === "warning") ? "warning"
    : "healthy";

  const report: HealthReport = {
    overall,
    checks,
    groups,
    meta: {
      todayStr,
      weekStart,
      nextWeekStart,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    },
  };

  return NextResponse.json(report);
}
