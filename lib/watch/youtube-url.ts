const ID = /^[a-zA-Z0-9_-]{11}$/;
export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (ID.test(value)) return value;
  try {
    const url = new URL(
      /^https?:\/\//.test(value) ? value : `https://${value}`,
    );
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      const parts = url.pathname.split("/");
      id = ["embed", "shorts", "live"].includes(parts[1])
        ? parts[2]
        : url.pathname === "/watch"
          ? url.searchParams.get("v")
          : null;
    }
    return id && ID.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function safeNext(value: string | null): string {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^\/(?:sign-in|auth)(?:[/?#]|$)/.test(value) &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/create";
}
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
