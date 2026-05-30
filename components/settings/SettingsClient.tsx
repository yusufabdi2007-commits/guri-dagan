"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { User, Target, Palette, Save, Bell } from "lucide-react";
import { PushNotificationButton } from "@/components/PushNotifications";
import type { Platform } from "@/types";

const PLATFORMS: Platform[] = ["TikTok", "YouTube", "Instagram", "Facebook"];
const TONES = ["Warm & Encouraging", "Direct & Practical", "Storytelling", "Islamic Perspective", "Educational", "Motivational"];

interface Profile {
  display_name: string | null;
  weekly_goal: number;
  preferred_platform: Platform;
  coach_tone: string;
}

interface Props {
  profile: Profile;
  userId: string;
}

export function SettingsClient({ profile: initialProfile, userId }: Props) {
  const [form, setForm] = useState<Profile>({
    display_name: initialProfile.display_name || "",
    weekly_goal: initialProfile.weekly_goal ?? 5,
    preferred_platform: initialProfile.preferred_platform ?? "TikTok",
    coach_tone: initialProfile.coach_tone ?? "Warm & Encouraging",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        display_name: form.display_name || null,
        weekly_goal: form.weekly_goal,
        preferred_platform: form.preferred_platform,
        coach_tone: form.coach_tone,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" as never });
    } else {
      toast({ title: "Settings saved!", variant: "success" as never });
    }
    setSaving(false);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-lg">
      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              placeholder="e.g. Guri Dagan"
              value={form.display_name || ""}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Shown on greetings and exports</p>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Content Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Weekly Post Goal</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={30}
                value={form.weekly_goal}
                onChange={e => setForm(f => ({ ...f, weekly_goal: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">posts per week</span>
            </div>
            <p className="text-xs text-muted-foreground">Used for your consistency score and progress bar</p>
          </div>

          <div className="space-y-2">
            <Label>Primary Platform</Label>
            <Select value={form.preferred_platform} onValueChange={v => setForm(f => ({ ...f, preferred_platform: v as Platform }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used as the default when marking posts and generating content</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-5 w-5 text-primary" />
            AI Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default AI Tone</Label>
            <Select value={form.coach_tone} onValueChange={v => setForm(f => ({ ...f, coach_tone: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Default tone used in the AI content generator</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium">Daily posting reminders</p>
              <p className="text-xs text-muted-foreground">Get a nudge if you have not posted yet</p>
            </div>
            <PushNotificationButton />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full h-12" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
