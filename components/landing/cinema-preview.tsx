import Image from "next/image";
import {
  Check,
  Heart,
  LockKeyhole,
  Maximize,
  Pause,
  Send,
  Volume2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
export function CinemaPreview() {
  return (
    <div className="preview-wrap">
      <div className="preview-floating-note">
        <span className="tiny-heart">
          <Heart size={14} fill="currentColor" />
        </span>{" "}
        Different places. Same moment.
      </div>
      <div
        className="cinema-preview"
        aria-label="Illustration of a watch party with synchronized video and conversation"
      >
        <div className="preview-header">
          <div>
            <span className="status-dot" />
            <span>Our little movie night</span>
            <span className="private-label">
              <LockKeyhole size={11} /> Private room
            </span>
          </div>
          <span className="preview-sync">
            <Check size={12} /> In sync
          </span>
        </div>
        <div className="preview-body">
          <div className="preview-film">
            <Image
              src="/mountain-cinema.jpg"
              alt="A wide alpine valley framed by mountains and forest"
              fill
              priority
              sizes="(max-width: 700px) 95vw, 800px"
            />
            <div className="film-shade" />
            <span className="film-top-label">A LITTLE ESCAPE, TOGETHER</span>
            <div className="film-caption">
              <span>Somewhere, with you.</span>
              <small>The world is wide. This moment is ours.</small>
            </div>
            <span className="preview-reaction reaction-one">❤️</span>
            <span className="preview-reaction reaction-two">✨</span>
            <div className="preview-playback">
              <div className="fake-progress">
                <i />
              </div>
              <div>
                <Pause size={17} fill="currentColor" />
                <Volume2 size={18} />
                <small>
                  12:48 <span>/ 28:06</span>
                </small>
                <span className="preview-hd">HD</span>
                <Maximize size={16} />
              </div>
            </div>
          </div>
          <aside className="preview-social">
            <div className="preview-social-top">
              <span>Just us</span>
              <span className="muted">2 people</span>
            </div>
            <div className="preview-people">
              <Avatar name="You" small />
              <Avatar name="Alex" small />
              <span>
                Here, together <i className="status-dot" />
              </span>
            </div>
            <div className="preview-chat">
              <div className="mock-message">
                <Avatar name="Alex" small />
                <div>
                  <small>
                    Alex <span>12:47</span>
                  </small>
                  <p>Okay, this is our next trip 🥹</p>
                </div>
              </div>
              <div className="mock-message own">
                <div>
                  <small>
                    You <span>12:48</span>
                  </small>
                  <p>Only if you’re coming with me ♡</p>
                </div>
              </div>
              <div className="shared-reaction">
                Alex sent some love <Heart size={13} fill="currentColor" />
              </div>
            </div>
            <div className="mock-reactions" aria-hidden="true">
              ❤️ <span>😂</span> 😮 <span>🔥</span> 🥹
            </div>
            <div className="mock-input">
              <span>Say a little something…</span>
              <Send size={14} />
            </div>
          </aside>
        </div>
      </div>
      <div className="preview-under">
        <span>
          <LockKeyhole size={12} /> Your room. Your people. Just you.
        </span>
        <span>Good company has no distance.</span>
      </div>
    </div>
  );
}
