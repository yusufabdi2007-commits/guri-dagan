import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StreakClient } from "@/components/streak/StreakClient";

export default async function StreakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: completions }, { data: freezes }] = await Promise.all([
    supabase.from("daily_completions").select("*").eq("user_id", user!.id).order("completed_date", { ascending: false }),
    supabase.from("streak_freezes").select("*").eq("user_id", user!.id).eq("used", false),
  ]);

  const dates = [...new Set((completions || []).map(c => c.completed_date.split("T")[0]))].sort().reverse();
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const _yest = new Date(Date.now() - 86400000);
  const yesterdayStr = `${_yest.getFullYear()}-${String(_yest.getMonth() + 1).padStart(2, "0")}-${String(_yest.getDate()).padStart(2, "0")}`;


  let currentStreak = 0;
  let longestStreak = 0;

  if (dates.length > 0 && (dates[0] === todayStr || dates[0] === yesterdayStr)) {
    currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
      if (diff === 1) currentStreak++;
      else break;
    }
  }

  let temp = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
    if (diff === 1) { temp++; longestStreak = Math.max(longestStreak, temp); }
    else temp = 1;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Daily Streak" subtitle="Your consistency engine" />
      <StreakClient
        completions={completions || []}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        totalPosts={dates.length}
        postedToday={dates[0] === todayStr}
        userId={user!.id}
        freezesAvailable={freezes?.length || 0}
      />
    </div>
  );
}
