import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clapperboard,
  Heart,
  Link2,
  LockKeyhole,
  MessageCircle,
  MonitorSmartphone,
  Play,
  Radio,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Brand } from "@/components/ui/brand";
import { CinemaPreview } from "@/components/landing/cinema-preview";
import { brand } from "@/lib/brand";
const features = [
  {
    icon: Radio,
    title: "One play. Two places.",
    text: "Play, pause, or skip ahead. Everyone stays in the same moment, automatically.",
    tag: "SYNCHRONIZED PLAYBACK",
    className: "feature-sync",
  },
  {
    icon: LockKeyhole,
    title: "A room just for you.",
    text: "No crowds, no public feeds. An invitation-only space for your favorite people.",
    tag: "PRIVATE BY DESIGN",
    className: "feature-private",
  },
  {
    icon: Heart,
    title: "Feel every little moment.",
    text: "The laughs. The plot twists. The “did you see that?” Send a reaction without saying a word.",
    tag: "LIVE REACTIONS",
    className: "feature-reactions",
  },
];
export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <section className="hero">
          <div className="hero-stars" aria-hidden="true" />
          <div className="eyebrow-pill">
            <span className="status-dot violet" /> A LITTLE CLOSER, EVEN FROM
            AFAR
          </div>
          <h1>
            Movies feel better
            <br />
            <span>together.</span>
            <svg
              className="headline-spark"
              viewBox="0 0 44 48"
              aria-hidden="true"
            >
              <path d="M19 2v12M38 13l-10 7M40 37l-12-5" />
            </svg>
          </h1>
          <p className="hero-copy">
            Your favorite videos. Your favorite person.
            <br />
            Watch in sync, share the little moments, and forget the distance.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/create">
              <Play size={17} fill="currentColor" /> Start a Watch Party{" "}
              <ArrowUpRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/join">
              <Link2 size={18} /> Join a Room
            </Link>
          </div>
          <div className="hero-benefits">
            <span>
              <Check size={13} /> Free to get together
            </span>
            <i />
            <span>
              <Check size={13} /> No downloads
            </span>
            <i />
            <span>
              <Check size={13} /> Just a link away
            </span>
          </div>
          <CinemaPreview />
        </section>
        <section className="device-strip" aria-label="Device support">
          <p>ONE SHARED MOMENT. ANY SCREEN.</p>
          <div>
            <span>
              <MonitorSmartphone size={18} /> Mac & PC
            </span>
            <span className="device-line" />
            <span>iPad</span>
            <span className="device-line" />
            <span>iPhone</span>
            <span className="device-line" />
            <span className="youtube-label">
              <span>▶</span> Made for YouTube
            </span>
          </div>
        </section>
        <section id="how-it-works" className="section how-section">
          <div className="section-heading">
            <span className="overline">LESS SETUP. MORE TOGETHER.</span>
            <h2>Movie night, minus the miles.</h2>
            <p>Three little steps. A whole lot closer.</p>
          </div>
          <div className="steps">
            {[
              {
                icon: Clapperboard,
                title: "Make it your movie night",
                text: "Pick a YouTube video and open your own private watch room.",
              },
              {
                icon: Link2,
                title: "Save them a seat",
                text: "Send an invite link. They can join from any device, with no account needed.",
              },
              {
                icon: Sparkles,
                title: "Press play. Be together.",
                text: "Perfectly timed reactions, real conversation, and one shared screen.",
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <article className="step" key={title}>
                <div className="step-top">
                  <div className="step-icon">
                    <Icon size={25} />
                  </div>
                  <span>0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="made-for-together" className="section features-section">
          <div className="section-heading">
            <span className="overline">IT’S THE LITTLE THINGS</span>
            <h2>
              More than watching.
              <br />
              <span>Being there.</span>
            </h2>
            <p>Everything you need to feel a little less far away.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text, tag, className }) => (
              <article className={`feature-card ${className}`} key={title}>
                <div className="feature-art" aria-hidden="true">
                  {className === "feature-sync" ? (
                    <div className="sync-art">
                      <span>
                        <Play size={21} fill="currentColor" />
                      </span>
                      <i />
                      <Radio size={28} />
                      <i />
                      <span>
                        <Play size={21} fill="currentColor" />
                      </span>
                    </div>
                  ) : className === "feature-private" ? (
                    <div className="lock-art">
                      <LockKeyhole size={36} />
                      <i />
                      <i />
                    </div>
                  ) : (
                    <div className="reaction-art">
                      <span>😂</span>
                      <span>❤️</span>
                      <span>🔥</span>
                    </div>
                  )}
                </div>
                <span className="feature-tag">
                  <Icon size={12} />
                  {tag}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="little-features">
            <div>
              <MessageCircle size={20} />
              <span>
                Conversation, uninterrupted
                <small>Live chat right beside the action.</small>
              </span>
            </div>
            <div>
              <MonitorSmartphone size={20} />
              <span>
                From your couch to theirs
                <small>Beautiful on every screen.</small>
              </span>
            </div>
            <div>
              <Clapperboard size={20} />
              <span>
                Get lost in the moment
                <small>Distraction-free cinema mode.</small>
              </span>
            </div>
          </div>
        </section>
        <section className="final-cta">
          <span className="cta-heart">
            <Heart size={24} />
          </span>
          <h2>
            A good night starts
            <br />
            with <em>“watch this with me.”</em>
          </h2>
          <p>There’s a seat waiting for your favorite person.</p>
          <Link href="/create" className="button button-primary">
            Start your movie night <ArrowRight size={17} />
          </Link>
          <span className="cta-note">
            A little time together goes a long way.
          </span>
        </section>
      </main>
      <footer className="footer">
        <Brand />
        <span>{brand.tagline}</span>
        <span className="footer-note">
          Made for moments that matter <Heart size={12} />
        </span>
      </footer>
    </>
  );
}
