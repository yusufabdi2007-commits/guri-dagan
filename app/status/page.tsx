import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, XCircle, AlertCircle, Server, Database, Zap, Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Check {
  label: string;
  ok: boolean;
  required: boolean;
  detail?: string;
}

export default async function StatusPage() {
  // Test Supabase connection
  let supabaseOk = false;
  let supabaseError = "";
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    supabaseOk = !error;
    if (error) supabaseError = error.message;
  } catch {
    supabaseError = "Connection failed";
  }

  const checks: Check[] = [
    {
      label: "Supabase URL",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      required: true,
    },
    {
      label: "Supabase Anon Key",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      required: true,
    },
    {
      label: "Supabase Live Connection",
      ok: supabaseOk,
      required: true,
      detail: supabaseError || undefined,
    },
    {
      label: "OpenAI API Key (AI features)",
      ok: Boolean(process.env.OPENAI_API_KEY),
      required: false,
    },
    {
      label: "Service Role Key (public /book)",
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      required: false,
    },
    {
      label: "Owner User ID (public /book)",
      ok: Boolean(process.env.OWNER_USER_ID),
      required: false,
    },
    {
      label: "App URL (push notifications)",
      ok: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      required: false,
    },
    {
      label: "VAPID Public Key (push notifications)",
      ok: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      required: false,
    },
    {
      label: "YouTube Data API Key (YouTube sync)",
      ok: Boolean(process.env.YOUTUBE_API_KEY),
      required: false,
    },
  ];

  const required = checks.filter(c => c.required);
  const optional = checks.filter(c => !c.required);
  const allRequiredOk = required.every(c => c.ok);
  const totalOk = checks.filter(c => c.ok).length;
  const setupPct = Math.round((totalOk / checks.length) * 100);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center pt-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            allRequiredOk
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }`}>
            <Server className={`h-8 w-8 ${allRequiredOk ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Guri Dagan</h1>
          <p className="text-sm text-muted-foreground mb-3">System Health Check</p>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
            allRequiredOk
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          }`}>
            {allRequiredOk
              ? <><CheckCircle2 className="h-4 w-4" /> Ready for production</>
              : <><XCircle className="h-4 w-4" /> Setup required</>
            }
          </div>
        </div>

        {/* Setup progress */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Setup Progress
            </p>
            <span className="text-sm font-bold text-primary">{totalOk}/{checks.length} active</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${setupPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{setupPct}% of features unlocked</p>
        </div>

        {/* Required checks */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Core Requirements
            </p>
          </div>
          <div className="divide-y divide-border">
            {required.map(check => (
              <div key={check.label} className="flex items-start justify-between px-4 py-3 gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  {check.detail && (
                    <p className="text-xs text-red-500 mt-0.5">{check.detail}</p>
                  )}
                </div>
                {check.ok
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Optional checks */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Optional Features
              </p>
              <span className="text-xs text-muted-foreground">
                {optional.filter(c => c.ok).length}/{optional.length} enabled
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {optional.map(check => (
              <div key={check.label} className="flex items-center justify-between px-4 py-3 gap-3">
                <p className={`text-sm ${check.ok ? "text-foreground" : "text-muted-foreground"}`}>
                  {check.label}
                </p>
                {check.ok
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  : <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Supabase migrations checklist */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Database Migrations</p>
          </div>
          <div className="divide-y divide-border">
            {["001_initial_schema.sql", "002_phase2_schema.sql", "003_phase3_schema.sql", "004_phase4_schema.sql", "005_phase5_schema.sql", "011_review_schema.sql", "012_batch_schema.sql", "013_inbox_schema.sql", "014_connections_schema.sql", "015_client_growth_schema.sql"].map(f => (
              <div key={f} className="flex items-center justify-between px-4 py-3 gap-3">
                <p className="text-sm text-muted-foreground font-mono">{f}</p>
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Run each migration in Supabase → SQL Editor if not already applied.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pb-4">
          <p className="text-xs text-muted-foreground">
            Checked: {new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            Go to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
