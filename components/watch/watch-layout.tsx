"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Keeps the same player mounted while its container changes size/position. */
export function WatchLayout({
  video,
  info,
  activities,
  social,
  cinema,
}: {
  video: ReactNode;
  info: ReactNode;
  activities: ReactNode;
  social: ReactNode;
  cinema: boolean;
}) {
  const marker = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const sentinel = marker.current;
    const player = screen.current;
    if (!sentinel || !player) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    const resize = new ResizeObserver(() => {
      // The full-size slot is retained when the player floats, preventing jumps.
      if (getComputedStyle(player).position !== "fixed")
        setHeight(player.getBoundingClientRect().height);
    });
    resize.observe(player);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);
  return (
    <div className="room-layout viewing-layout">
      <div className="watch-column">
        <div
          className={`watch-screen-slot ${pinned && !cinema ? "screen-pinned" : ""}`}
          style={{ "--screen-slot-height": `${height}px` } as CSSProperties}
        >
          <div ref={marker} className="screen-sentinel" aria-hidden="true" />
          <div ref={screen} className="watch-screen">
            {video}
          </div>
        </div>
        {info}
      </div>
      <div
        className="room-companion"
        role="region"
        aria-label="Games and conversation"
        tabIndex={0}
      >
        {activities}
        {social}
      </div>
    </div>
  );
}
