import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeId } from "@/lib/watch/youtube-url";
export async function GET(request: NextRequest) {
  const id = extractYouTubeId(request.nextUrl.searchParams.get("url") || "");
  if (!id)
    return NextResponse.json(
      { error: "Please enter a valid YouTube URL." },
      { status: 400 },
    );
  try {
    // Fixed origin and validated ID prevent arbitrary URL fetching / SSRF.
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return NextResponse.json({ id, title: null });
    const data = await response.json();
    return NextResponse.json({
      id,
      title: typeof data.title === "string" ? data.title.slice(0, 160) : null,
    });
  } catch (error) {
    console.warn(
      "YouTube preview unavailable",
      error instanceof Error ? error.name : "network error",
    );
    return NextResponse.json({ id, title: null });
  }
}
