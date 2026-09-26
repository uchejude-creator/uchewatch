export function authErrorMessage(error: unknown, verifying = false): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "over_email_send_rate_limit")
    return "Email delivery has reached its sending limit. Please wait before trying again. Requesting repeatedly won’t help.";
  if (code === "over_request_rate_limit")
    return "Please wait a minute before trying again.";
  if (code === "email_address_not_authorized")
    return "Email delivery isn’t available for this address yet. Please contact the host.";
  if (verifying)
    return "That code or link has expired or was already used. Request a fresh email and use its latest code or link.";
  return "We couldn’t send your sign-in email. Please check your connection and try again.";
}
