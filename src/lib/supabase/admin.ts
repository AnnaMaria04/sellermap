import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client that bypasses Row-Level Security.
 * SERVER ONLY — uses the secret key. Never import this from client code.
 * Use for scheduled sync jobs and trusted server-side mutations.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
