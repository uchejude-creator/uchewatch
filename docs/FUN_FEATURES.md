# Our little extras

Open a room and expand **Our little extras** beneath the video. The existing 44-emoji picker remains available above it. These features use the existing Supabase project; no new paid service or dependency was added. Existing hosting/database quotas still apply.

## Features

| Area | What you can do |
| --- | --- |
| Little moments | Tap or hold a love burst, send a flying kiss between avatars, float a short love note over the video, choose shared rose/violet/midnight lighting, announce a snack break, and share virtual popcorn. |
| Ready, baby? | Ask your person to get ready. After both confirm, a server-timed countdown starts the shared video. Tap the video once first if Safari asks to enable playback. |
| Up next | Add YouTube links to a shared playlist, attach a dedication, hide a surprise pick until reveal, save your special song, or let the host choose a random queued video. The host loads videos paused so both can get ready. |
| Play together | Secret compliments, pause-and-predict, simultaneous emoji ratings, Would You Rather, This or That, Two Truths and a Lie with mutual guesses, favorite-part reveals, and Movie Bingo: pause, privately pick a scene description, agree together, and score matching picks. |
| Keepsakes | Choose room-only pet names, save the current video timestamp with a note, revisit moments, and make a date ticket with an SVG download and a native invitation share sheet/clipboard fallback. |
| Goodnight | Both write a closing message. They reveal together, playback pauses, and the room lights dim. “Stay a little longer” restores the normal room without ending it. |

Two-person activities select another online participant. If more than one person is available, choose the intended partner. Only one paired activity is active at a time; either player or the host may cancel it. Reactions, moods, playlists and keepsakes are visible to all room members.

## Data and authorization

`room_fun` stores bounded shared state and a monotonically increasing revision. Its SELECT policy checks room membership; clients have no direct write grant. `public.fun_action` delegates to a private validated function, derives the actor from Auth, locks the room, validates membership/ownership/input and rate-limits actions. Host-only video changes use the same authoritative playback fields as the player.

Secret answers are stored in the unexposed `private.fun_answers` table with no client grants. Only submission status is published before both answers arrive. For Two Truths and a Lie, statements reveal first; the correct lies stay private until both guesses arrive. Pending answers are deleted when their activity completes or is replaced/cancelled. This is server-enforced secrecy between participants, not end-to-end encryption.

Surprise playlist picks are a playful UI reveal, **not a security boundary**: their video IDs and titles are part of the room state. Do not put sensitive secrets in them.

Only the latest 12 celebration events are retained. They expire visually after 6.5 seconds and old effects are not replayed on refresh. This bounded snapshot is not a permanent event history. Shared state has limits of 30 queued videos and 40 saved moments; messages and pending answers also have length limits. The most recent 32 action IDs suppress duplicates. Room closure rejects further actions.

`useFun` receives Postgres Changes, reconciles on subscription/visibility, and checks again every 15 seconds. Offline controls are disabled and errors are visible. Reduced-motion users receive simplified effects. Native YouTube fullscreen may hide website overlays; use cinema mode to keep them visible.

## Verification and deployment

Apply `20260926201951_date_night.sql` after the original schema. The new table must be in the Realtime publication (the migration adds it). No additional environment variables are required.

Automated SQL tests cover authorization, secret answers, host-only changes, countdown, queue, games, tickets and closure. Browser tests exercise actual components and SQL across two fixture pages, but use BroadcastChannel in place of the hosted Realtime transport. See [verification notes](VERIFICATION.md) for exact test boundaries.

Before relying on a date night, run both devices through love burst, ready countdown, a secret reveal, a queued video and goodnight. Physical Safari playback permissions, native sharing and suspension need real-device acceptance.

## Movie Bingo scoring

Movie Bingo replaces the old grid. “Pause & pick” pauses the shared video and starts a round for the selected pair. Both secretly choose Romantic, Funny, Sad, Shocking, or Tense. Once both picks reveal, each accepts a winning description. Only matching acceptances finalize the round; each original pick matching that answer earns one point. Votes can change while players disagree. Skip cancels without points. Totals stay with the room, including across refreshes. Playback stays paused until a participant presses play.

Apply `20260927102144_movie_bingo.sql` after the date-night migration. It replaces the validated action function, reuses private answers and room locks, and calculates points only once per finalized round. Clients cannot supply score totals. Legacy card data is retained for compatibility but the card UI is removed.

## Watching while you play

On wide desktop windows, the video stays on the left while the games and conversation column scrolls independently on the right. At widths up to 1100px, scrolling past the video pins a compact player and its playback controls to the top. Returning to the video restores its full size. The same iframe remains mounted throughout, preserving player state. Cinema mode retains its larger viewing layout.
