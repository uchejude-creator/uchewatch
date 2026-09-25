# UcheWatch

**Your own little cinema.** A private YouTube watch party with shared playback, live conversation, presence, and reactions. Built for the people you want beside you, wherever they are.

This repository contains the complete application and database migration. A dedicated Supabase project must be connected before accounts and live rooms work. There is no fake live-room fallback. The landing-page room is a clearly illustrative HTML/CSS composition.

## What’s included

- Cinematic landing page, responsive navigation, original wordmark, locally hosted typography and imagery.
- Email magic links, optional Google OAuth, profile display names, and anonymous guest sessions.
- Authenticated room creation, invitation URLs, short room codes, thumbnail/title previews, and guest entry.
- Official YouTube IFrame API with native controls and additional accessible shared controls.
- Persistent, server-authoritative play/pause/seek/video state and reconnect snapshots.
- Private Realtime channels for online presence and ephemeral reactions; RLS-filtered Postgres Changes for playback and chat.
- Chat with persistent history, message deduplication, and retained drafts on send failure.
- Cinema mode, collapsible chat, native share sheets, clipboard invitations, waiting/error/loading states.
- Install metadata, original PNG/SVG icons, safe-area support, reduced motion, and keyboard controls.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS 4, Lucide, `@supabase/ssr`, Supabase Auth/Postgres/Realtime, YouTube IFrame Player API. Versions are pinned in `package.json` and `package-lock.json`. Node 22+ is recommended; development was verified on Node 24.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase project URL and public key.
npm run dev
```

Open http://localhost:3000. The public pages still work without Supabase configuration. Account and room forms explain the missing setup and never simulate successful creation.

```bash
npm run lint       # ESLint / React / Next.js rules
npm run typecheck  # Strict TypeScript
npm test           # URL, drift, and real SQL/RLS tests via PGlite
npm run build      # Production build; assets are bundled, no font download required
npm start          # Serve the production build
npm run test:e2e   # Browser suite; see tests documentation below
```

## Set up your Supabase project

1. Create a **new dedicated project** in Supabase. This implementation does not modify any existing connected project.
2. In the project SQL Editor, run the complete file:
   `supabase/migrations/20260925185621_private_watch_rooms.sql`.
   Run it once on a fresh project. It creates tables, indexes, limited RPCs, RLS policies, private-channel authorization, and publication entries.
3. Keep Data API exposed schemas at their normal defaults (`public`, etc.). **Do not expose the `private` schema.** It contains authorization helpers and rate-limit state. The migration explicitly grants table reads and approved RPC execution to authenticated sessions, including anonymous guest sessions. No direct table writes are granted.
4. In **Authentication → Sign In / Providers**, enable email and **anonymous sign-ins**. Anonymous Auth is how invited guests receive a real user ID without creating a permanent account. Without it, guests cannot join.
5. Set the Auth **Site URL** to your deployed HTTPS origin. Add redirect URLs for both `http://localhost:3000/auth/callback` and `https://your-domain/auth/callback`. For a staging deployment add its exact callback URL too. If you change ports, add that port’s URL.
6. Email magic links use PKCE through `@supabase/ssr`. Keep the default email template’s `{{ .ConfirmationURL }}` link. Open the email link in the **same browser** that requested it so the PKCE verifier cookie is available. Configure custom SMTP for a public launch; Supabase’s default mail service has restrictive delivery limits.
7. Optional: enable Google in Supabase Auth, configure its OAuth client and the Supabase-provided callback URL in Google Cloud, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Leave it false otherwise.
8. Under Realtime settings, enable private-channel authorization and disable public channel access if available. The app always subscribes with `private: true`. Verify `watch_rooms`, `room_messages`, and `room_participants` are in the `supabase_realtime` publication (the migration adds them).
9. Copy your project URL and **publishable key** from the project Connect dialog / API settings into `.env.local`. A legacy anon key is also supported. Restart the dev server after changing environment values.
10. Before a public launch, review Auth rate limits, SMTP delivery, project security advisors, and data retention. Anonymous Auth can be abused to create many identities; the database’s per-user throttles are helpful but are not IP-level abuse prevention. If enabling Supabase CAPTCHA, add a CAPTCHA widget and pass its token to anonymous sign-in first; this version does not include a CAPTCHA widget.

You can use the Supabase CLI instead of SQL Editor: inspect `npx supabase link --help` and `npx supabase db push --help`, link the intended **new** project, and push the checked-in migration. Never push it blindly into a project used by another product.

## Environment variables

| Variable                               | Required              | Meaning                                             |
| -------------------------------------- | --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes for live features | `https://<project-ref>.supabase.co`                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preferred public key  | `sb_publishable_...`, safe for browser use with RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Alternative only      | Legacy anon key if no publishable key is set        |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`      | No                    | `true` only after Google OAuth setup; default false |
| `NEXT_PUBLIC_APP_NAME`                 | No                    | Defaults to `UcheWatch`                             |

**Never add a service role key or secret API key to this app’s public variables.** The application does not need one. Environment files are gitignored; `.env.example` contains no secrets. `NEXT_PUBLIC_` values are embedded at build time, so production changes require a new deployment.

To rename the product, set `NEXT_PUBLIC_APP_NAME`. Shared copy and metadata use `lib/brand.ts`. The logo motif can be replaced independently in `components/ui/brand.tsx` and `public/icon.svg`.

## The first real watch party

1. Person A opens `/create`, pastes an embeddable YouTube link, and names the night.
2. If necessary, A signs in with email or Google. The draft survives the redirect in session storage.
3. A creates the room and opens **Invite** to copy/share its link or code.
4. Person B opens the link on iPad/iPhone/Mac, enters a display name, and joins.
5. Both tap the video once if their browser requires interaction to enable playback.
6. Play, pause, seek, chat, send a reaction, and open **People**. Everyone can control playback; only the host changes the video or ends the room.
7. Reload B’s page or disconnect and reconnect it; the latest database state is fetched and reapplied.

Room URLs contain an unguessable UUID capability. Room codes are 10 hexadecimal characters (40 random bits), case-insensitive, and protected by a per-user lookup limit. Treat both like invitations: anyone holding one can redeem membership. Rooms are never publicly listed.

## Architecture

```text
app/                  Server-rendered pages, auth callback, video metadata API
components/landing/   HTML/CSS cinema illustration
components/ui/        Wordmark, navigation, modal, avatar, configuration state
components/watch/     Actual player, chat, people, invite and room screens
hooks/use-room.ts     Supabase subscription, snapshot recovery, chat and reactions
hooks/use-synced-player.ts  Provider lifecycle, user controls and drift correction
lib/supabase/         Cookie-based browser/server clients and configuration
lib/watch/providers/  Provider-neutral contract and YouTube implementation
lib/watch/sync.ts     Pure synchronization math and tunable thresholds
lib/brand.ts          Replaceable name and shared brand copy
supabase/migrations/  Schema, authorization and server-authoritative RPCs
proxy.ts              Server-side Auth token refresh for account/room routes
tests/                Unit and migration/RLS integration tests
e2e/                  Responsive browser checks and test-only fixtures
docs/                 Verification notes and launch checklist
```

## How synchronization works

The database owns the canonical timeline. Each accepted command stores the room ID, authenticated actor, action, position, playing state, **database timestamp**, and monotonically increasing revision. Commands lock the room row; concurrent changes are serialized, and clients ignore older revisions. Clients cannot forge another actor or directly update tables.

Playback is persisted through `set_playback`, then distributed by Supabase Realtime Postgres Changes. Unlike a client-only broadcast, this survives a host refresh and gives late arrivals a canonical snapshot. Reactions use private Broadcast and are not stored. Online status uses private Presence; membership names come from database records, not untrusted presence metadata.

A snapshot estimates server clock offset using the midpoint of the request. While playing, expected position is the saved timestamp plus elapsed server time. Every five seconds:

- Below **0.5 seconds** drift: ignore it.
- Moderate drift: observe once, then seek if it persists into the next check.
- **2.5 seconds or more**: seek to the estimated shared timestamp.

YouTube does not offer arbitrary subtle speed adjustment, so the adapter uses conservative seeks. Thresholds live in `lib/watch/sync.ts`. Remote operations have a suppression window to prevent echo loops. Native YouTube seek changes are detected through discontinuities in sampled time; buffering and background-tab wakeups are excluded. Commands are not broadcast before the player is ready. Custom seeks commit on pointer release or keyboard actions, not every drag frame.

After reconnecting, returning to the tab, and periodically every 20 seconds, the app reconciles playback, the most recent 200 messages, and membership. Duplicate messages are merged by ID. Sending the same message ID twice is idempotent. Presence disappears when the Realtime connection leaves; durable membership survives refresh. Keeping the room open with no host online is allowed.

This is practical approximate synchronization, not frame-accurate broadcast equipment. Different ads, buffering, browser restrictions, and device clocks affect precision. Real-device measurement is required before promising a numerical sync guarantee.

## Privacy and security model

- All public application tables use RLS; strangers cannot enumerate rooms, participants, or messages.
- Room creation requires a non-anonymous Auth account, checked against `auth.users` on the server.
- Invitation redemption checks an exact code/UUID, rate-limits lookups, and caps lifetime memberships at 20 per room.
- Approved database functions mediate all writes. Definer helpers are in the unexposed `private` schema with an empty search path, explicit grants, and membership/ownership checks.
- Message names and command actor IDs are server-derived. Text is rendered as React text, not HTML.
- Closing a room disables further joins, chat writes, and playback updates. Connected clients observe the closure and stop rendering the player. Realtime authorization is cached for a connection’s lifetime, so ending a room is **not** an instant cryptographic revocation of an already connected malicious client’s broadcast access; do not send sensitive secrets via reactions/presence.
- A member may read their historical room data after closure. This version has no removal/blocking UI, invitation rotation, chat deletion, expiry, or retention job. Add a documented retention policy before a public launch.
- The app does not implement end-to-end encryption. Data is stored in the configured Supabase project. YouTube receives normal embed requests only when the real room player loads; videos use the privacy-enhanced embed host.

## Safari, iPad and PWA notes

- `playsinline=1`, safe-area padding, minimum player height, responsive stacked layouts, and large controls support iOS/iPadOS.
- Safari can require a direct user tap before remote play is allowed. An explicit **Tap to enable playback** button handles YouTube’s autoplay-blocked event. No autoplay-policy bypass is attempted.
- Cinema mode is an app layout mode and works without the Fullscreen API. YouTube retains its own native fullscreen control. Native fullscreen may hide the app’s chat/reactions on iOS.
- iOS can suspend background tabs. Returning to the app reconciles the timeline; it cannot force background video playback.
- A manifest, theme color, PNG icons, and Apple install metadata support Add to Home Screen. This is an **online application**; no service worker caches private video, Auth responses, or chat. Offline playback is not implemented.

## Future Safari extension / other providers

`VideoProvider` defines mount/play/pause/seek/load/time/duration/state/volume/destroy. A future local-video adapter can implement those methods without changing room synchronization.

A separately installed Safari Web Extension could implement the same contract through an explicit, consented message bridge. Validate the origin, room membership, provider capabilities, and message schemas at that boundary. Require users to authorize provider access independently. Extension distribution, App Store signing, provider licensing, and playback permissions are separate work.

**No Netflix/Disney+/Prime DOM manipulation, credential sharing, DRM circumvention, or protected-stream extraction is included.** Provider support should use permitted APIs and independently authorized integrations.

## Deploy to Vercel

1. Push this repository to your Git host and import it into Vercel as a Next.js project.
2. Select a supported Node runtime (22 or newer), use `npm install` / `npm run build`, and retain the default Next.js output settings.
3. Add the public environment variables above to the intended environments. Never put real values in source control.
4. Deploy. Add the resulting HTTPS origin and exact `/auth/callback` URL in Supabase Auth settings.
5. Complete the two-device acceptance checklist in `docs/VERIFICATION.md` using the deployed domain.

The app uses no in-process WebSocket server or sticky session, so Vercel functions can scale independently; browsers connect to Supabase Realtime directly.

## Tests and known limitations

`npm test` executes the checked-in SQL against PGlite with Supabase-owned `auth` and `realtime` infrastructure stubbed. It verifies actual SQL, role grants, RLS isolation, authenticated/guest distinctions, room-code redemption, chat deduplication, host-only video changes, playback validation, invalid-invite throttling, and room closure. It does **not** replace hosted Supabase/Auth/Realtime testing.

Browser evidence and exact verification boundaries are recorded in `docs/VERIFICATION.md`. Live magic-link delivery, Google OAuth, production Realtime, real two-device timing, AirPlay, and physical iOS behavior require the configured project and real devices. YouTube videos that disable embedding, require sign-in/age verification, or are unavailable cannot be played; the UI asks the host to choose another video. YouTube live streams and individualized ads are not reliable synchronization targets for this version; use normal on-demand videos.

Further public-launch work: real-device acceptance, CAPTCHA integration if needed, production SMTP, operational monitoring, an explicit data-retention policy, and invitation revocation/participant removal. No video/audio calling or public room directory is included.
