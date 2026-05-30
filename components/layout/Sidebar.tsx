"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Lightbulb, Sparkles, CalendarDays, Video,
  BarChart3, CheckCircle2, Moon, Sun, LogOut, Film, Zap,
  TrendingUp, MessageSquareQuote, Users, Mic2, Layers, Package, Settings, Megaphone,
  Youtube, FileBarChart2, Clapperboard, Brain, GitBranch, MonitorPlay, ScanSearch, CalendarRange,
  Star, MessageSquare, Plug, UserCheck, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/today", icon: Star, label: "Today's Post" },
  { href: "/ideas", icon: Lightbulb, label: "Content Ideas" },
  { href: "/inbox", icon: MessageSquare, label: "Q&A Inbox" },
  { href: "/queue", icon: Film, label: "Recording Queue" },
  { href: "/generator", icon: Sparkles, label: "AI Generator" },
  { href: "/streak", icon: CheckCircle2, label: "Daily Streak" },
];

const toolsNav = [
  { href: "/pipeline", icon: GitBranch, label: "Content Pipeline" },
  { href: "/transcript", icon: Mic2, label: "Shorts Generator" },
  { href: "/repurpose", icon: Layers, label: "Repurpose Engine" },
  { href: "/hook-scorer", icon: Zap, label: "Hook Scorer" },
  { href: "/trends", icon: TrendingUp, label: "Trends & Topics" },
];

const businessNav = [
  { href: "/announcements", icon: Megaphone, label: "Community" },
  { href: "/packages", icon: Package, label: "Packages" },
  { href: "/testimonials", icon: MessageSquareQuote, label: "Testimonials" },
  { href: "/crm", icon: Users, label: "Client CRM" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/videos", icon: Video, label: "Video Tracker" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const operationsNav = [
  { href: "/channel", icon: MonitorPlay, label: "Channel Dashboard" },
  { href: "/batch", icon: CalendarRange, label: "Weekly Batch" },
  { href: "/leads", icon: UserCheck, label: "Lead Pipeline" },
  { href: "/business", icon: Building2, label: "Business Intel" },
];

const intelligenceNav = [
  { href: "/connections", icon: Plug, label: "Connections" },
  { href: "/strategist", icon: Brain, label: "AI Strategist" },
  { href: "/weekly-report", icon: FileBarChart2, label: "Weekly Report" },
  { href: "/youtube", icon: Youtube, label: "YouTube Analytics" },
  { href: "/tiktok", icon: Clapperboard, label: "TikTok Tracker" },
];

function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border bg-sidebar sticky top-0 overflow-y-auto scrollbar-hide">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base">H</span>
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground leading-tight">Guri Dagan</h1>
            <p className="text-[10px] text-muted-foreground">Parenting Coach System</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <div className="space-y-0.5">
          {mainNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">AI Tools</p>
          {toolsNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Operations</p>
          {operationsNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Intelligence</p>
          {intelligenceNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Business</p>
          {businessNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-0.5">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-all duration-200"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
