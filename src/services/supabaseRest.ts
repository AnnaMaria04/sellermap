import "server-only";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && serviceRoleKey);
}

export async function supabaseRest<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<{ ok: true; data: T } | { ok: false; status: "not_configured" | "failed"; error: string }> {
  if (!url || !serviceRoleKey) {
    return {
      ok: false,
      status: "not_configured",
      error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const endpoint = new URL(`/rest/v1/${path}`, url);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    endpoint.searchParams.set(key, value);
  }

  const res = await fetch(endpoint, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      status: "failed",
      error: await res.text(),
    };
  }

  return { ok: true, data: (await res.json()) as T };
}
