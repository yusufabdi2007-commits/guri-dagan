"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Star, CalendarRange, BarChart3,
  UserCheck, Baby, Shield, Settings,
  LayoutDashboard, Lightbulb, Film, CheckCircle2, MessageSquare, Sparkles,
  CalendarDays, Video, Zap, TrendingUp, MessageSquareQuote, Users, Mic2, Layers,
  Package, Megaphone, Youtube, FileBarChart2, Clapperboard, Brain, GitBranch,
  MonitorPlay, Wand2, Plug, Building2, PieChart, PhoneCall, PoundSterling,
  Clock, HeartHandshake, ClipboardList, Activity,
  Sun, Moon, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

const primaryNav = [
  { href: "/today", icon: Star, label: "Today" },
  { href: "/batch", icon: CalendarRange, label: "This Week" },
  { href: "/business", icon: BarChart3, label: "Results" },
];

const clientsNav = [
  { href: "/leads", icon: UserCheck, label: "Lead Pipeline" },
  { href: "/consultations", icon: PhoneCall, label: "Consultations" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/children", icon: Baby, label: "Children" },
  { href: "/success", icon: HeartHandshake, label: "Parent Success" },
  { href: "/checkins", icon: ClipboardList, label: "Weekly Check-ins" },
  { href: "/followups", icon: Clock, label: "Follow-ups" },
];

const programsNav = [
  { href: "/programs", icon: Shield, label: "Program Dashboard" },
  { href: "/program-report", icon: PieChart, label: "Program Report" },
  { href: "/outcomes", icon: Activity, label: "Program Outcomes" },
  { href: "/revenue", icon: PoundSterling, label: "Revenue" },
];

const contentNav = [
  { href: "/weekly-assignment", icon: Wand2, label: "Weekly Assignment" },
  { href: "/ideas", icon: Lightbulb, label: "Content Ideas" },
  { href: "/inbox", icon: MessageSquare, label: "Q&A Inbox" },
  { href: "/queue", icon: Film, label: "Recording Queue" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/videos", icon: Video, label: "Video Tracker" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

const toolsNav = [
  { href: "/channel", icon: MonitorPlay, label: "Channel Dashboard" },
  { href: "/strategist", icon: Brain, label: "AI Strategist" },
  { href: "/connections", icon: Plug, label: "Connections" },
  { href: "/pipeline", icon: GitBranch, label: "Content Pipeline" },
  { href: "/generator", icon: Sparkles, label: "AI Generator" },
  { href: "/repurpose", icon: Layers, label: "Repurpose Engine" },
  { href: "/transcript", icon: Mic2, label: "Shorts Generator" },
  { href: "/hook-scorer", icon: Zap, label: "Hook Scorer" },
  { href: "/trends", icon: TrendingUp, label: "Trends & Topics" },
  { href: "/weekly-report", icon: FileBarChart2, label: "Weekly Report" },
  { href: "/youtube", icon: Youtube, label: "YouTube Analytics" },
  { href: "/tiktok", icon: Clapperboard, label: "TikTok Tracker" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/streak", icon: CheckCircle2, label: "Daily Streak" },
  { href: "/announcements", icon: Megaphone, label: "Community" },
  { href: "/packages", icon: Package, label: "Packages" },
  { href: "/testimonials", icon: MessageSquareQuote, label: "Testimonials" },
  { href: "/crm", icon: Users, label: "Client CRM" },
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

function NavSection({ label, items }: { label: string; items: typeof primaryNav }) {
  return (
    <div className="pt-4 pb-1">
      <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {items.map(item => <NavItem key={item.href} {...item} />)}
    </div>
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

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">

        {/* Primary 3-screen OS */}
        <div className="space-y-0.5">
          {primaryNav.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <NavSection label="Clients" items={clientsNav} />
        <NavSection label="Programs" items={programsNav} />
        <NavSection label="Content" items={contentNav} />
        <NavSection label="Tools" items={toolsNav} />

        <div className="pt-4 pb-1">
          <NavItem href="/settings" icon={Settings} label="Settings" />
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
