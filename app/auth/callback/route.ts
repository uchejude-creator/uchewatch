import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/watch/youtube-url";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const supabase = await serverSupabase();
  // A used link must not send an already signed-in person back through login.
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !user.is_anonymous)
      return NextResponse.redirect(new URL(next, request.url));
  }
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error("Auth callback failed", error.code);
  }
  return NextResponse.redirect(
    new URL(
      `/sign-in?error=callback&next=${encodeURIComponent(next)}`,
      request.url,
    ),
  );
}
