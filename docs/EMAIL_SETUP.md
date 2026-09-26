# Authentication email reliability

## Persistent login

The browser client persists sessions in cookies and refreshes them automatically. The Next.js proxy refreshes sessions for protected pages. Signed-in, non-anonymous users visiting `/sign-in` are redirected to their destination; a reused callback does not discard an existing valid session. Navigation reflects the current session. Guest sessions do not count as permanent accounts.

Use the same browser after the first successful sign-in. Clearing cookies, private browsing, explicitly signing out, or server revocation can require a new sign-in. The account itself is not recreated.

## Optional email templates (not enabled in production)

Supabase currently requires custom SMTP to edit these templates. External email setup was cancelled, so production keeps the original PKCE emails and hides code entry. Do not enable `NEXT_PUBLIC_EMAIL_CODES_ENABLED=true` until both templates below are configured.

Deploy `/auth/confirm` before applying `supabase/templates/sign-in.html` to BOTH **Confirm signup** and **Magic Link** templates. Use subject `Your UcheWatch sign-in code`.

The code is `{{ .Token }}`. Its length follows Supabase's Email OTP length setting; the UI accepts 6–10 digits (this project's current setting is 8). `verifyOtp({email,token,type:"email"})` signs in without a PKCE verifier from another browser.

The link uses `{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}`. The fragment is removed from browser history on load and never sent in the initial HTTP request. Loading the page does not redeem the token; a user must tap Continue. This reduces accidental consumption by scanners that only visit links. If a scanner strips the fragment or aggressively interacts with pages, use the code instead.

Tokens stay single-use. Reusing a consumed/expired token should fail and offer a fresh email. Do not make tokens reusable. Successful authentication creates the usual persisted Supabase session. Google OAuth and already-issued PKCE links keep using `/auth/callback`.

The app distinguishes email-provider rate limits from expired tokens, preserves the address for retry, offers a resend countdown, and lets someone enter an existing code without requesting another email.

## Status

Supabase's original mail service returned `over_email_send_rate_limit` during live testing. External email delivery setup was deferred at the user’s request. UI changes do not remove the existing provider sending limit.
