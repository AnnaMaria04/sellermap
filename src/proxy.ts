import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Cookie set by the "Войти как разработчик" button on /login. While present,
// the auth gate is bypassed and the app runs on the local demo/seed account.
// TEMPORARY developer convenience — remove when full auth rollout is done.
const DEV_BYPASS_COOKIE = "sm_dev_bypass";
const DEV_ROLE_COOKIE = "sm_dev_role";

type Role = "owner" | "manager" | "cashier" | "warehouse";

// Which roles may access each route prefix (longest prefix wins).
const ROLE_ROUTES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/settings/staff", roles: ["owner"] },
  { prefix: "/settings/billing", roles: ["owner"] },
  { prefix: "/settings", roles: ["owner", "manager"] },
  { prefix: "/pos", roles: ["owner", "manager", "cashier"] },
  { prefix: "/inventory", roles: ["owner", "manager", "warehouse"] },
  { prefix: "/finance", roles: ["owner", "manager"] },
  { prefix: "/analytics", roles: ["owner", "manager"] },
  { prefix: "/customers", roles: ["owner", "manager"] },
];

// Where to send a user who lacks access to the route they requested.
function landingFor(role: Role): string {
  if (role === "cashier") return "/pos";
  if (role === "warehouse") return "/inventory";
  return "/inventory";
}

function enforceRole(request: NextRequest, role: Role): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  // Longest matching prefix wins (so /settings/staff beats /settings).
  const match = ROLE_ROUTES
    .filter((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (match && !match.roles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = landingFor(role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  // Developer bypass — skip the Supabase auth check, but still enforce roles
  // using the role chosen on the dev login screen.
  if (request.cookies.get(DEV_BYPASS_COOKIE)?.value === "1") {
    const devRole = (request.cookies.get(DEV_ROLE_COOKIE)?.value as Role) || "owner";
    return enforceRole(request, devRole) ?? NextResponse.next({ request });
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

  // Role from JWT custom claim (set server-side); default to owner if absent.
  const role = ((user.app_metadata?.role ?? user.user_metadata?.role) as Role) || "owner";
  return enforceRole(request, role) ?? response;
}

export const config = {
  matcher: [
    "/inventory/:path*",
    "/pos/:path*",
    "/catalog/:path*",
    "/finance/:path*",
    "/analytics/:path*",
    "/customers/:path*",
    "/settings/:path*",
  ],
};
