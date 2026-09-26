"use client";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { activeEvents, countdownSeconds } from "@/lib/fun/catalog";
import type { FunState } from "@/lib/fun/types";
export function FunOverlays({
  state,
  offset,
  name,
  startsAt,
}: {
  state: FunState;
  offset: number;
  name: (id: string) => string;
  startsAt?: string;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [offset]);
  const events = activeEvents(state.events, now);
  const count = startsAt ? countdownSeconds(startsAt, now) : 0;
  return (
    <div className="fun-overlays" aria-live="polite">
      {count > 0 && count <= 4 && (
        <div className="together-countdown" role="status">
          <span>Both here. Both ready.</span>
          <strong>{Math.min(3, count)}</strong>
          <span>Your movie starts together</span>
        </div>
      )}
      {events.map((event) =>
        event.kind === "burst" ? (
          <div
            key={event.id}
            className="love-burst"
            aria-label={`${name(event.by)} sent a love burst`}
          >
            {Array.from({ length: 14 }, (_, i) => (
              <span
                aria-hidden="true"
                key={i}
                style={{
                  left: `${8 + ((i * 23) % 84)}%`,
                  animationDelay: `${(i % 5) * 0.12}s`,
                  fontSize: `${22 + (i % 4) * 9}px`,
                }}
              >
                {["❤️", "💕", "💖", "🩷"][i % 4]}
              </span>
            ))}
          </div>
        ) : event.kind === "note" ? (
          <div key={event.id} className="screen-love-note">
            <small>{name(event.by)} left you a little note</small>
            <p>{event.text}</p>
          </div>
        ) : event.kind === "kiss" ? (
          <div key={event.id} className="flying-kiss">
            <span>
              <Avatar name={name(event.by)} small />
              {name(event.by)}
            </span>
            <strong aria-hidden="true">💋</strong>
            <span>
              <Avatar name={name(event.to || "")} small />
              {name(event.to || "")}
            </span>
          </div>
        ) : (
          <div key={event.id} className="popcorn-pop">
            🍿 <span>{name(event.by)} stole a little popcorn!</span>
          </div>
        ),
      )}
    </div>
  );
}
