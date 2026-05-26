import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Cookie set by the "Войти как разработчик" button on /login. While present,
// the auth gate is bypassed and the app runs on the local demo/seed account.
// TEMPORARY developer convenience — remove when full auth rollout is done.
const DEV_BYPASS_COOKIE = "sm_dev_bypass";

export async function proxy(request: NextRequest) {
  // Developer bypass — skip the auth gate entirely.
  if (request.cookies.get(DEV_BYPASS_COOKIE)?.value === "1") {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured (preview builds) — don't lock anyone out.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validate the session. Fail open on network errors so a Supabase outage
  // can't brick every protected page.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return response;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/inventory/:path*", "/pos/:path*", "/catalog/:path*"],
};
