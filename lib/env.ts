/**
 * Environment variable validation.
 * Call validateEnv() early in server-side code (e.g. middleware or API routes)
 * to get clear error messages instead of cryptic runtime failures.
 */

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase Project URL (found in Supabase → Project Settings → API)",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase anon public key (found in Supabase → Project Settings → API)",
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    description: "OpenAI API key — required for AI generation features (platform.openai.com)",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: false,
    description: "App base URL, e.g. https://your-app.vercel.app or http://localhost:3010",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: false,
    description: "Supabase service role key — required only for the public /book endpoint",
  },
  {
    key: "OWNER_USER_ID",
    required: false,
    description: "Coach's Supabase user ID — required only for the public /book endpoint",
  },
  {
    key: "YOUTUBE_API_KEY",
    required: false,
    description: "YouTube Data API v3 key — required for YouTube channel sync (Google Cloud Console)",
  },
];

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.key];
    if (!value || value.trim() === "") {
      if (v.required) {
        missing.push(`MISSING (required): ${v.key} — ${v.description}`);
      } else {
        warnings.push(`MISSING (optional): ${v.key} — ${v.description}`);
      }
    }
  }

  if (missing.length > 0 || warnings.length > 0) {
    if (missing.length > 0) {
      console.error("\n[ENV] ❌ Required environment variables are missing:");
      missing.forEach(m => console.error(`  • ${m}`));
    }
    if (warnings.length > 0) {
      console.warn("\n[ENV] ⚠️  Optional environment variables not set (some features will be limited):");
      warnings.forEach(w => console.warn(`  • ${w}`));
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

/** Returns true if OpenAI features are available */
export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Returns true if the public booking endpoint is configured */
export function hasPublicBooking(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && process.env.OWNER_USER_ID?.trim());
}
