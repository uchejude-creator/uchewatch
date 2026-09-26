# Verification

## Automated checks

Results are recorded at implementation time; rerun them after changing the project.

- `npm install`: dependencies installed, pinned, and lockfile created; installation reported zero known vulnerabilities.
- `npm run lint`: React, TypeScript, and Next.js lint rules.
- `npm run typecheck`: strict type checking.
- `npm test`: synchronization math, URL/redirect validation, and migration/security tests against actual Postgres via PGlite.
- `npm run build`: full production compilation and route generation.
- Browser tests: **14 passed** across Chromium and WebKit on 25 September 2026.

The final local run passed lint, strict type checking, all **6** unit/database tests, and a full production build. Public landing/create/join/sign-in/account screens and the actual room component layout were checked at **375, 430, 768, 820, 1024, and 1440px**, with no horizontal overflow. Screenshots were reviewed for desktop and tablet; the local browser reported no uncaught application errors.

The browser suite also verifies input validation, missing-configuration feedback, mobile navigation, invalid routes, expired-link feedback, install icons/manifest, reduced motion, failed chat draft retention, retry, and keyboard dialog focus restoration. A test-only YouTube adapter stub and in-memory authoritative callback exercise the actual player components and synchronization hook for play/pause/seek propagation and feedback-loop prevention. These fixtures do **not** test the live YouTube network or Supabase Realtime transport and are never exposed by the application.

Hosted Auth, email delivery, real guest entry, production Realtime, native Web Share, and physical iPad/iPhone playback remain unverified until a dedicated Supabase project is configured. Follow the acceptance test below before inviting real users.

To reproduce browser checks, run `npx playwright install chromium webkit`, then `npm run test:e2e`. The Playwright configuration starts a development server if one is not already running. Generated traces and screenshots stay in ignored `test-results/`.

PGlite tests stub the **Supabase platform infrastructure**, not the application SQL. Browser room layout fixtures, when used, exercise actual rendered components with test data and are not available in the application. They do not certify live synchronization.

## Required hosted acceptance test

After connecting a dedicated Supabase project:

1. Run the migration and enable anonymous Auth, email links, and private Realtime.
2. Sign in as A with a magic link. Create a room with an ordinary embeddable YouTube VOD.
3. Open Invite, copy the link, verify the room code, and test the native Share sheet on iPad.
4. In a separate browser/profile or iPad, join as B with only a display name.
5. Verify both names and the Host label under People; refresh B and confirm membership persists.
6. Tap each player once. A plays, pauses, seeks forward and back; verify B follows. Repeat with B controlling.
7. Test native YouTube controls as well as the app controls. Check that updates do not echo endlessly.
8. Pause for 20 seconds, join a third device, and verify its initial timestamp. Repeat while playing.
9. Send simultaneous messages both ways; refresh and confirm the messages persist once each.
10. Send all five reactions; confirm they appear on both clients and disappear without becoming chat history.
11. Disconnect B from the network. Verify offline status and disabled send controls. Restore the network and verify the latest state and missed messages return.
12. Background the iPad tab, let A seek, then return. Verify correction and any necessary tap-to-play prompt.
13. Switch videos as A; verify all clients load it paused at the beginning. Verify B cannot switch videos.
14. Enter cinema mode, open/close chat, exit with Escape on Mac, and test device rotation.
15. End the room as A. Verify both clients see the end state, old invitation redemption fails, and direct write attempts are rejected.
16. Test an expired magic link, invalid room code, unavailable video, closed room, and disabled embeds.
17. With an unrelated Auth session, verify room/participant/message SELECT queries return no private rows.

## Device matrix

375, 430, 768, 820, 1024, and 1440 CSS pixels. Verify portrait and landscape, readable chat, no horizontal scrolling, accessible focus order, touch targets, reduced motion, and safe-area behavior.

Physical-device acceptance must include macOS Safari/Chrome, iPad Safari, and iPhone Safari. Emulated Chromium or WebKit checks are helpful but do not certify hardware playback restrictions, native share sheets, AirPlay, or background suspension behavior.
