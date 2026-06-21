import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only. Never import in Client Components.
 * Used for operations that bypass RLS (e.g. none in normal flow — prefer RPC).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
