"use client";
import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { brand } from "@/lib/brand";
export function InviteModal({
  id,
  code,
  onClose,
}: {
  id: string;
  code: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const url = `${window.location.origin}/room/${id}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError("");
    } catch {
      setError(
        "Copy isn’t available in this browser. Select and copy the link below.",
      );
    }
  }
  async function share() {
    try {
      await navigator.share({
        title: `Watch with me on ${brand.name}`,
        text: "I saved you a seat. Let’s watch together.",
        url,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        setError(
          "Sharing couldn’t open. You can copy the invitation link instead.",
        );
    }
  }
  return (
    <Modal title="Save them a seat." onClose={onClose}>
      <p>
        A whole movie night, in one little link. Send it to someone you’d love
        to have here.
      </p>
      <div className="copy-row">
        <input
          aria-label="Invitation link"
          value={url}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button
          className="icon-button"
          aria-label={copied ? "Link copied" : "Copy invitation link"}
          onClick={copy}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
      {copied && (
        <p role="status" className="form-foot">
          Invitation copied. A good night is on its way.
        </p>
      )}
      <div className="invite-code">
        <small>OR SHARE YOUR ROOM CODE</small>
        <strong>{code}</strong>
      </div>
      {typeof navigator.share === "function" && (
        <button className="button button-primary full-width" onClick={share}>
          <Share2 size={17} /> Share invitation
        </button>
      )}
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <p className="form-foot">
        Anyone with this invitation can join. Share it with your people.
      </p>
    </Modal>
  );
}
