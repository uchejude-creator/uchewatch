import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isConfigured, supabaseUrl, supabaseKey } from "./lib/supabase/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isConfigured) return response;
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/create",
    "/join",
    "/room/:path*",
    "/account",
    "/auth/:path*",
    "/sign-in",
  ],
};
