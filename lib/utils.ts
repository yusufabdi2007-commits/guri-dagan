import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your journey today. One post changes everything.";
  if (streak === 1) return "You started! Keep going — momentum begins here.";
  if (streak === 3) return "3 days strong! Parents are already benefiting from your work.";
  if (streak === 7) return "7 days consistent! You are building something beautiful.";
  if (streak === 14) return "2 weeks of impact! Somali families are learning from you.";
  if (streak === 21) return "21 days! You have built a habit. Keep going.";
  if (streak === 30) return "30 days! A month of consistent impact. Mashallah!";
  if (streak >= 60) return "60+ days! You are a beacon of consistency. Your community needs you.";
  if (streak >= 5) return `${streak} days! Your consistency builds trust and changes lives.`;
  return `${streak} days of impact. Keep going — every post matters.`;
}

export function getConsistencyScore(postsThisWeek: number): number {
  const target = 5; // 5 posts per week target
  return Math.min(100, Math.round((postsThisWeek / target) * 100));
}

export function getWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function getPlatformColor(platform: string): string {
  switch (platform) {
    case "TikTok": return "bg-black text-white";
    case "YouTube": return "bg-red-500 text-white";
    case "Instagram": return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    case "Facebook": return "bg-blue-600 text-white";
    default: return "bg-gray-500 text-white";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "Idea": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Recorded": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Edited": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "Posted": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    default: return "bg-gray-100 text-gray-700";
  }
}
