import { NextResponse, type NextRequest } from "next/server";

export async function proxy(_request: NextRequest) {
  // TEST MODE: auth gate disabled — inventory is open without login,
  // state is persisted in the browser (localStorage). Re-enable the
  // Supabase session check below when wiring auth back up.
  return NextResponse.next();

  // --- Original auth gate (disabled for testing) ---
  // let response = NextResponse.next({ request });
  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       getAll() {
  //         return request.cookies.getAll();
  //       },
  //       setAll(cookiesToSet) {
  //         cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
  //         response = NextResponse.next({ request });
  //         cookiesToSet.forEach(({ name, value, options }) =>
  //           response.cookies.set(name, value, options),
  //         );
  //       },
  //     },
  //   },
  // );
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user && request.nextUrl.pathname.startsWith("/inventory")) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/login";
  //   url.searchParams.set("next", request.nextUrl.pathname);
  //   return NextResponse.redirect(url);
  // }
  // return response;
}

export const config = {
  matcher: ["/inventory/:path*"],
};
