import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Supabase client for API routes hit by the mobile app (Bearer token, no
 * cookies). Passing the caller's access token as the client's own auth
 * header makes every query run under that user's RLS policies, same as the
 * cookie-based server client used by the web app.
 */
export function createClientFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
