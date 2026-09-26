"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import Image from "next/image";
import { useEffect, useState } from "react";
import { extractYouTubeId } from "@/lib/watch/youtube-url";
export function VideoField({
  value,
  onChange,
  onTitle,
}: {
  value: string;
  onChange: (value: string) => void;
  onTitle?: (title: string) => void;
}) {
  const hydrated = useHydrated();
  const id = extractYouTubeId(value);
  const [preview, setPreview] = useState<{
    id: string;
    title: string | null;
  } | null>(null);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/video?url=${id}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (!controller.signal.aborted) {
            setPreview(data);
            if (data.title) onTitle?.(data.title);
          }
        })
        .catch((error) => {
          if (error.name !== "AbortError")
            console.warn("Video preview could not load");
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [id, onTitle]);
  return (
    <>
      <div className="field">
        <label htmlFor="youtube-url">YouTube link</label>
        <input
          disabled={!hydrated}
          id="youtube-url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="text"
          inputMode="url"
          placeholder="Paste a YouTube link…"
          required
          autoComplete="off"
          aria-describedby="video-help"
        />
        <small id="video-help">
          Music, a documentary, or that video you had to share.
        </small>
        {value.trim() && !id && (
          <small className="error-notice" role="alert">
            That doesn’t look like a YouTube link yet.
          </small>
        )}
      </div>
      {id && (
        <div className="video-preview">
          <Image
            src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
            alt="Selected YouTube video thumbnail"
            width={112}
            height={63}
            unoptimized
          />
          <div>
            <strong>
              {preview?.id === id && preview.title
                ? preview.title
                : "Your next shared moment"}
            </strong>
            <small>YouTube · Ready to watch together</small>
          </div>
        </div>
      )}
    </>
  );
}
