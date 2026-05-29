import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Memoised singleton — @supabase/ssr expects one browser client per tab so its
// cookie storage stays consistent. Recreating it on every call (e.g. each login
// submit) let the auth cookie race the navigation, which is why login sometimes
// needed several clicks before it "took".
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser-side Supabase client. Returns null when env vars are absent (SSR prerender). */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!browserClient) browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}
