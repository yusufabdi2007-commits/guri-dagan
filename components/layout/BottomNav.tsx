"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Film, Sparkles, CheckCircle2,
  Lightbulb, MoreHorizontal, CalendarDays, Video, BarChart3,
  Zap, TrendingUp, MessageSquareQuote, Users, Mic2, X, Sun, Moon, LogOut,
  Layers, Package, Settings, Megaphone, Youtube, FileBarChart2, Clapperboard, Brain, GitBranch, MonitorPlay, ScanSearch, CalendarRange,
  Star, MessageSquare, Plug, UserCheck, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

const primaryNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/today", icon: Star, label: "Today" },
  { href: "/ideas", icon: Lightbulb, label: "Ideas" },
  { href: "/queue", icon: Film, label: "Queue" },
];

const moreItems = [
  { href: "/leads", icon: UserCheck, label: "Leads" },
  { href: "/business", icon: Building2, label: "Business" },
  { href: "/batch", icon: CalendarRange, label: "Weekly Batch" },
  { href: "/streak", icon: CheckCircle2, label: "Streak" },
  { href: "/inbox", icon: MessageSquare, label: "Q&A Inbox" },
  { href: "/connections", icon: Plug, label: "Connections" },
  { href: "/channel", icon: MonitorPlay, label: "Channel" },
  { href: "/strategist", icon: Brain, label: "Strategist" },
  { href: "/pipeline", icon: GitBranch, label: "Pipeline" },
  { href: "/announcements", icon: Megaphone, label: "Community" },
  { href: "/generator", icon: Sparkles, label: "AI Generator" },
  { href: "/repurpose", icon: Layers, label: "Repurpose" },
  { href: "/transcript", icon: Mic2, label: "Shorts AI" },
  { href: "/hook-scorer", icon: Zap, label: "Hook Scorer" },
  { href: "/trends", icon: TrendingUp, label: "Trends" },
  { href: "/weekly-report", icon: FileBarChart2, label: "Weekly Report" },
  { href: "/youtube", icon: Youtube, label: "YouTube" },
  { href: "/tiktok", icon: Clapperboard, label: "TikTok" },
  { href: "/packages", icon: Package, label: "Packages" },
  { href: "/testimonials", icon: MessageSquareQuote, label: "Testimonials" },
  { href: "/crm", icon: Users, label: "Client CRM" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/videos", icon: Video, label: "Videos" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const isMoreActive = moreItems.some(i => pathname === i.href || pathname.startsWith(i.href + "/"))
    || pathname.startsWith("/review/");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMoreOpen(false);
    router.push("/login");
  }

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More bottom sheet */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-3xl md:hidden transition-transform duration-300 ease-out",
        moreOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="swipe-indicator mt-3" />
        <div className="px-4 pb-safe">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground">More</h3>
            <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {moreItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setMoreOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-bottom">
        <div className="glass border-t border-border/50 px-1 pt-1.5 pb-1">
          <div className="flex items-center justify-around">
            {primaryNav.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div className={cn("p-1.5 rounded-xl transition-all duration-200", active && "bg-primary/10")}>
                    <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                  </div>
                  <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                    {label}
                  </span>
                </Link>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn("p-1.5 rounded-xl transition-all duration-200", isMoreActive && "bg-primary/10")}>
                <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
              </div>
              <span className={cn("text-[10px] font-medium", isMoreActive ? "text-primary" : "text-muted-foreground")}>
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
