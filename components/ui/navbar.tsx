"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
export function Navbar() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Brand />
        <div className="desktop-nav">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#made-for-together">The little things</Link>
          <span className="nav-divider" />
          <Link href="/sign-in">Sign in</Link>
          <Link className="button button-small button-primary" href="/create">
            Start watching <ArrowUpRight size={16} />
          </Link>
        </div>
        <button
          className="icon-button mobile-menu-toggle"
          disabled={!hydrated}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <nav
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Mobile navigation"
        >
          <Link onClick={() => setOpen(false)} href="/#how-it-works">
            How it works
          </Link>
          <Link href="/join">Join a room</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link className="button button-primary" href="/create">
            Start watching <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}
