import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { validateEnv } from "@/lib/env";

// Validate env vars once at startup (only logs — never blocks requests)
let envChecked = false;
if (!envChecked) {
  validateEnv();
  envChecked = true;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
