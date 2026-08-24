import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/academy",
  "/codelab",
  "/shop",
  "/vault",
  "/profile",
  "/mentor",
  "/settings",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth =
    path === "/game" ||
    path === "/account/setup" ||
    PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && needsAuth) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/account/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (user && path === "/game") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .single();
    if (!profile?.onboarded_at) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/account/setup";
      return NextResponse.redirect(redirect);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/game",
    "/account/setup",
    "/academy/:path*",
    "/codelab/:path*",
    "/shop",
    "/vault",
    "/profile",
    "/mentor",
    "/settings",
  ],
};
