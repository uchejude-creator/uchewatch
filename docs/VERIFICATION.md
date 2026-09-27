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

## Login follow-up — 26 September 2026

The authentication fixture passes **8 checks across Chromium and WebKit**: resend cooldown, provider quota feedback, explicit confirmation before token redemption, and persisted login after reload and in a new tab. These tests use the real Supabase browser client with mocked Auth responses; they do not certify live email delivery. Code entry is disabled by default and requires configured email templates.

Signed-in permanent users now skip the sign-in page. Reopening a used callback preserves an existing valid login, and the homepage navigation reflects the browser session. Authentication destinations reject loops back into sign-in/callback routes.

Live inspection found an existing guest session and room in the in-app browser; a guest can view their profile but cannot create rooms. A completed permanent-account email login in this browser has not been independently verified. Resend/SMTP configuration was cancelled by the user and remains unchanged.

Final follow-up run: lint, type checking, 6 unit/database tests, the production build, and all **22 browser checks** passed. The full browser suite includes the requested responsive widths.

## Date-night release — 27 September 2026

- Lint, strict type checking, all **8 unit/database tests**, and the production build passed.
- Full browser suite: **32 passed** in Chromium and WebKit, including all six requested widths. New checks cover two-page celebrations, secret reveals, goodnight, playlist dedications, and a future authoritative player start without feedback commands.
- The date-night fixture uses the actual SQL migration and UI, with BroadcastChannel replacing hosted Realtime. It is not an application route and does not certify physical two-device timing.
- The migration was applied to the dedicated hosted project. Read-only hosted checks confirmed RLS, member SELECT/RPC grants, no direct writes or private-answer reads, no unauthenticated RPC execution, and the Realtime publication entry. A rollback-only hosted action test could not run because the MCP database role cannot execute the authenticated RPC or assume that role; no test rows were committed. Local authenticated-role SQL tests passed.
- Security advisors were reviewed. Deny-all RLS on private helper tables is intentional, as are member-scoped policies allowing invited anonymous Auth users. See [deny-all policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [guest policy notice](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins). The pre-existing [password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains; this app uses email links rather than password login.
- Physical Mac/iPad playback, native sharing and background suspension are still acceptance checks for the two owners. No paid services were added.

### Production follow-up

The date-night release was confirmed READY on the production alias. All four panels were inspected in the live room. A real guest-session mood action saved to the hosted database, then a second same-session tab changed it back and the first tab updated without a reload. This verifies live shared-state propagation, not two independent people or physical device timing. The original violet mood was restored. No chat messages or private activity answers were sent.

During the subsequent browser check, the official YouTube API script failed to load (including after the displayed Reload player action); the app rendered its connection/content-blocker error safely. The new date-night controls remained available. No date-night console errors were observed. Live video playback on this connection therefore remains unverified; investigate the network/content-blocker path if the failure persists on the users’ devices.
