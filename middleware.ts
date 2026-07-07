import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MOCK_COOKIE_NAME = "paper-trade-session";

export async function middleware(request: NextRequest) {
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  const path = request.nextUrl.pathname;

  // Paths that require authentication
  const isProtectedPath = 
    path === "/dashboard" ||
    path.startsWith("/market") ||
    path.startsWith("/stock/") ||
    path.startsWith("/portfolio") ||
    path.startsWith("/orders") ||
    path.startsWith("/trades") ||
    path.startsWith("/watchlist") ||
    path.startsWith("/leaderboard") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings") ||
    path.startsWith("/notifications") ||
    path.startsWith("/admin");

  // Auth paths (login, signup) - should redirect to dashboard if already authenticated
  const isAuthPath = path === "/login" || path === "/signup";

  let isAuthenticated = false;

  if (isMock) {
    // Check local mock cookie session
    const mockSession = request.cookies.get(MOCK_COOKIE_NAME);
    if (mockSession?.value) {
      try {
        JSON.parse(mockSession.value);
        isAuthenticated = true;
      } catch {
        isAuthenticated = false;
      }
    }
  } else {
    // Real Supabase Auth Middleware
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    isAuthenticated = !!user;

    if (isProtectedPath && !isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isAuthPath && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  }

  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
