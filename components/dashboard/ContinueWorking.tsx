"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Edit3, Upload, Lightbulb, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformColor } from "@/lib/utils";

interface CalendarItem {
  id: string;
  title: string;
  platform: string;
  status: string;
}

interface WorkIdea {
  id: string;
  title: string;
  platform: string;
  status: string;
}

interface Props {
  todayScheduled: CalendarItem[];
  recordedIdeas: WorkIdea[];   // status = "Recorded" → needs editing
  editedIdeas: WorkIdea[];     // status = "Edited"   → needs posting
  postedToday: boolean;
}

interface WorkItem {
  id: string;
  label: string;
  title: string;
  platform: string;
  icon: React.ElementType;
  urgency: "high" | "medium" | "low";
  href: string;
  iconColor: string;
}

export function ContinueWorking({ todayScheduled, recordedIdeas, editedIdeas, postedToday }: Props) {
  const items: WorkItem[] = [];

  // Priority 1 — due today on the calendar (highest urgency)
  todayScheduled.forEach(item => {
    items.push({
      id: `cal-${item.id}`,
      label: "Due today",
      title: item.title,
      platform: item.platform,
      icon: Calendar,
      urgency: "high",
      href: "/calendar",
      iconColor: "text-rose-500",
    });
  });

  // Priority 2 — edited ideas ready to post
  editedIdeas.slice(0, 2).forEach(idea => {
    items.push({
      id: `edited-${idea.id}`,
      label: "Ready to post",
      title: idea.title,
      platform: idea.platform,
      icon: Upload,
      urgency: "medium",
      href: "/ideas",
      iconColor: "text-green-500",
    });
  });

  // Priority 3 — recorded ideas needing editing
  recordedIdeas.slice(0, 2).forEach(idea => {
    items.push({
      id: `recorded-${idea.id}`,
      label: "Needs editing",
      title: idea.title,
      platform: idea.platform,
      icon: Edit3,
      urgency: "medium",
      href: "/ideas",
      iconColor: "text-blue-500",
    });
  });

  // All clear state
  if (items.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {postedToday ? "All clear — you've posted today." : "Nothing urgent right now."}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {postedToday
                  ? "Use this time to capture ideas or plan ahead."
                  : "Schedule content or capture a new idea to keep momentum going."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const urgentCount = items.filter(i => i.urgency === "high").length;

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-7 h-7 gradient-primary rounded-xl flex items-center justify-center">
              <Lightbulb className="h-3.5 w-3.5 text-white" />
            </div>
            Continue Working
          </CardTitle>
          {urgentCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {urgentCount} due today
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {items.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors active:bg-muted tap-scale group"
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  item.urgency === "high"
                    ? "bg-rose-100 dark:bg-rose-900/30"
                    : item.urgency === "medium"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-muted"
                }`}>
                  <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${
                      item.urgency === "high" ? "text-rose-500" : "text-muted-foreground"
                    }`}>
                      {item.label}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${getPlatformColor(item.platform)}`}>
                      {item.platform}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-1">{item.title}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
