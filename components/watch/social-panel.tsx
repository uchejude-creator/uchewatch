"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Heart, MessageCircle, Send, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { ChatMessage, Participant } from "@/types/watch";
export function SocialPanel({
  messages,
  people,
  userId,
  hostId,
  connected,
  onSend,
}: {
  messages: ChatMessage[];
  people: Participant[];
  userId: string;
  hostId: string;
  connected: boolean;
  onSend: (message: string, id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"chat" | "people">("chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const pendingId = useRef<string | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousCount = useRef(0);
  useEffect(() => {
    if (messages.length > previousCount.current) {
      if (nearBottom.current && tab === "chat")
        content.current?.scrollTo({
          top: content.current.scrollHeight,
          behavior: "smooth",
        });
      else setUnread((n) => n + messages.length - previousCount.current);
    }
    previousCount.current = messages.length;
  }, [messages, tab]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    pendingId.current ??= crypto.randomUUID();
    try {
      await onSend(text.trim(), pendingId.current);
      setText("");
      pendingId.current = null;
      nearBottom.current = true;
      setUnread(0);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Message not sent. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="social-panel" aria-label="Room conversation">
      <div
        className="social-tabs"
        role="tablist"
        aria-label="Room social panel"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "chat"
              : event.key === "End"
                ? "people"
                : tab === "chat"
                  ? "people"
                  : "chat";
          setTab(next);
          if (next === "chat") {
            setUnread(0);
            nearBottom.current = true;
          }
          event.currentTarget
            .querySelector<HTMLButtonElement>(`#${next}-tab`)
            ?.focus();
        }}
      >
        <button
          id="chat-tab"
          role="tab"
          aria-selected={tab === "chat"}
          aria-controls="chat-panel"
          tabIndex={tab === "chat" ? 0 : -1}
          onClick={() => {
            setTab("chat");
            setUnread(0);
            nearBottom.current = true;
          }}
        >
          <MessageCircle size={15} /> Chat{" "}
          {unread > 0 && <small>{unread}</small>}
        </button>
        <button
          id="people-tab"
          role="tab"
          aria-selected={tab === "people"}
          aria-controls="people-panel"
          tabIndex={tab === "people" ? 0 : -1}
          onClick={() => setTab("people")}
        >
          <Users size={15} /> People <small>{people.length}</small>
        </button>
      </div>
      {tab === "chat" ? (
        <>
          <div
            className="chat-content"
            ref={content}
            id="chat-panel"
            role="tabpanel"
            aria-labelledby="chat-tab"
            onScroll={(e) => {
              const c = e.currentTarget;
              nearBottom.current =
                c.scrollHeight - c.scrollTop - c.clientHeight < 70;
              if (nearBottom.current) setUnread(0);
            }}
          >
            {messages.length === 0 ? (
              <div className="chat-empty">
                <Heart size={26} />
                <h3>A little conversation?</h3>
                <p>
                  Say hello, share a thought, or tell them you’re glad they’re
                  here.
                </p>
              </div>
            ) : (
              <>
                <div className="chat-date">YOUR SHARED MOMENTS</div>
                <div
                  role="log"
                  aria-label="Chat messages"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {messages.map((message) => (
                    <article
                      className={`chat-message ${message.user_id === userId ? "own" : ""}`}
                      key={message.id}
                    >
                      {message.user_id !== userId && (
                        <Avatar name={message.display_name} small />
                      )}
                      <div>
                        <div className="message-meta">
                          <span>
                            {message.user_id === userId
                              ? "You"
                              : message.display_name}
                          </span>
                          <time dateTime={message.created_at}>
                            {new Date(message.created_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </time>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
          {unread > 0 && (
            <button
              className="text-button"
              onClick={() => {
                content.current?.scrollTo({
                  top: content.current.scrollHeight,
                  behavior: "smooth",
                });
                setUnread(0);
              }}
            >
              ↓ {unread} new messages
            </button>
          )}
          <form className="chat-form" onSubmit={send}>
            {error && (
              <p className="error-notice" role="alert">
                {error}
              </p>
            )}
            <div className="chat-input-row">
              <input
                aria-label="Your message"
                placeholder="Say a little something…"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  pendingId.current = null;
                }}
                maxLength={1000}
                disabled={busy}
                autoComplete="off"
              />
              <button
                className="icon-button"
                aria-label="Send message"
                disabled={!text.trim() || busy || !connected}
              >
                <Send size={17} />
              </button>
            </div>
            <small>
              {connected
                ? "Just between the people in this room."
                : "Reconnecting… your draft is safe here."}
            </small>
          </form>
        </>
      ) : (
        <div
          className="people-list"
          id="people-panel"
          role="tabpanel"
          aria-labelledby="people-tab"
        >
          {people.map((person) => (
            <div key={person.user_id} className="person">
              <Avatar name={person.display_name} />
              <div>
                <strong>
                  {person.display_name}
                  {person.user_id === userId ? " (you)" : ""}
                  {person.user_id === hostId && (
                    <span className="host-badge">Host</span>
                  )}
                </strong>
                <small>Here for the moment</small>
              </div>
              <span className="status-dot" aria-label="Online" />
            </div>
          ))}
          {people.length < 2 && (
            <div className="chat-empty" style={{ padding: "30px 0" }}>
              <Heart size={22} />
              <p>There’s room for your person. Send them an invitation.</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
