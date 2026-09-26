"use client";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { VideoField } from "@/components/video-field";
import { extractYouTubeId } from "@/lib/watch/youtube-url";
export function ChangeVideoModal({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange: (id: string) => Promise<unknown>;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const id = extractYouTubeId(url);
    if (!id) return;
    setBusy(true);
    try {
      await onChange(id);
      onClose();
    } catch {
      setError("The video couldn’t be changed. Please try again.");
      setBusy(false);
    }
  }
  return (
    <Modal title="What’s up next?" onClose={onClose}>
      <p>A new video, the same good company.</p>
      <form onSubmit={submit}>
        <VideoField value={url} onChange={setUrl} />
        {error && (
          <p role="alert" className="error-notice">
            {error}
          </p>
        )}
        <button
          className="button button-primary full-width"
          disabled={busy || !extractYouTubeId(url)}
        >
          {busy ? "Changing the scene…" : "Watch this together"}
        </button>
      </form>
    </Modal>
  );
}
