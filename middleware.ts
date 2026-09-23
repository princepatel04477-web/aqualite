import { NextResponse, type NextRequest } from "next/server";

import { verifyValue } from "@/lib/auth/sign";

export async function middleware(request: NextRequest) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const raw = request.cookies.get("aq_session")?.value;
  let role: string | null = null;
  let signedIn = false;
  if (raw && secret) {
    const value = await verifyValue(raw, secret);
    if (value) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (parsed && typeof parsed === "object" && "role" in parsed) {
          signedIn = true;
          role = String((parsed as { role?: string }).role ?? "");
        }
      } catch {
        signedIn = false;
      }
    }
  }
  if (request.nextUrl.pathname.startsWith("/account") && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (request.nextUrl.pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.rewrite(new URL("/denied", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
