"use client";
import { useState } from "react";
import { Heart, Plus, X } from "lucide-react";
import { REACTION_GROUPS } from "@/types/watch";
const FAVORITES = ["❤️", "🥰", "😘", "😂", "🔥"];
export function ReactionPicker({ connected, onReact }: {
  connected: boolean;
  onReact: (emoji: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const button = (emoji: string) => (
    <button type="button" className="reaction-button" key={emoji}
      aria-label={`Send ${emoji} reaction`} disabled={!connected}
      onClick={() => void onReact(emoji)}>{emoji}</button>
  );
  return (
    <section className="reaction-picker" aria-label="Send a little love">
      <div className="reactions-bar">
        <span>Some things need no words.</span>
        <div className="reaction-buttons">
          {FAVORITES.map(button)}
          <button type="button" className="reaction-button reaction-more"
            aria-label={open ? "Close emoji collection" : "More emojis"}
            aria-expanded={open} aria-controls="emoji-collection"
            onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Plus size={20} />}</button>
        </div>
      </div>
      {open && <div id="emoji-collection" className="emoji-collection">
        <div className="emoji-collection-heading"><Heart size={16} /><div>
          <strong>A little love, on their screen.</strong>
          <p>{connected ? "Tap any emoji. Send as many little moments as you like." : "Reconnecting… your reactions will be ready soon."}</p>
        </div></div>
        {REACTION_GROUPS.map((group) => <div className="emoji-group" key={group.label}>
          <h3>{group.label}</h3>
          <div className="emoji-grid">{group.emojis.map(button)}</div>
        </div>)}
      </div>}
    </section>
  );
}
