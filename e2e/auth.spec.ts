import { test, expect } from "@playwright/test";
import { build } from "esbuild";
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["e2e/auth-harness.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: {
      "process.env": "{}",
      "process.env.NEXT_PUBLIC_EMAIL_CODES_ENABLED": '"true"',
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_APP_NAME": '"UcheWatch"',
      "process.env.NEXT_PUBLIC_SUPABASE_URL": '"https://auth-test.supabase.co"',
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": '"public-test-key"',
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""',
      "process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED": '"false"',
    },
  });
  bundle = result.outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.route("https://auth-test.supabase.co/**", (r) => r.abort());
  await page.route("**/__test__/auth-bundle.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: bundle }),
  );
  await page.route("**/__test__/auth**", (r) => {
    if (r.request().url().endsWith(".js")) return r.fallback();
    return r.fulfill({
      contentType: "text/html",
      body: '<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/__test__/auth-bundle.js"></script>',
    });
  });
});
test("Fresh emails have a resend cooldown and codes use email verification", async ({
  page,
}) => {
  let requests = 0,
    verified: unknown;
  await page.route("https://auth-test.supabase.co/auth/v1/otp**", (r) => {
    requests++;
    return r.fulfill({ json: {} });
  });
  await page.route("https://auth-test.supabase.co/auth/v1/verify", (r) => {
    verified = r.request().postDataJSON();
    return r.fulfill({
      status: 403,
      headers: {"x-supabase-api-version":"2024-01-01", "access-control-expose-headers":"x-supabase-api-version"},
      json: { code: "otp_expired", msg: "expired" },
    });
  });
  await page.goto("/__test__/auth");
  await page.getByLabel("What should we call you?").fill("Viewer");
  await page.getByLabel("Email address").fill("viewer@example.com");
  await page.getByRole("button", { name: "Send me a sign-in email" }).click();
  await expect(
    page.getByRole("button", { name: /Send another email in/ }),
  ).toBeDisabled();
  expect(requests).toBe(1);
  await page.getByLabel("Email code").fill("12345678");
  await page.getByRole("button", { name: "Sign in with code" }).click();
  await expect(page.getByRole("alert")).toContainText("already used");
  expect(verified).toMatchObject({
    email: "viewer@example.com",
    token: "12345678",
    type: "email",
  });
});
test("Email provider limits produce actionable feedback", async ({ page }) => {
  await page.route("https://auth-test.supabase.co/auth/v1/otp**", (r) =>
    r.fulfill({
      status: 429,
      headers: {"x-supabase-api-version":"2024-01-01", "access-control-expose-headers":"x-supabase-api-version"},
      json: { code: "over_email_send_rate_limit", msg: "rate limit" },
    }),
  );
  await page.goto("/__test__/auth");
  await page.getByLabel("What should we call you?").fill("Viewer");
  await page.getByLabel("Email address").fill("viewer@example.com");
  await page.getByRole("button", { name: "Send me a sign-in email" }).click();
  await expect(page.getByRole("alert")).toContainText("sending limit");
  await expect(
    page.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "I already have an email code" })
    .click();
  await expect(page.getByLabel("Email code")).toBeVisible();
});
test("Opening a confirmation link does not consume its token", async ({
  page,
}) => {
  let requests = 0,
    body: unknown;
  await page.route("https://auth-test.supabase.co/auth/v1/verify", (r) => {
    requests++;
    body = r.request().postDataJSON();
    return r.fulfill({
      status: 403,
      headers: {"x-supabase-api-version":"2024-01-01", "access-control-expose-headers":"x-supabase-api-version"},
      json: { code: "otp_expired", msg: "expired" },
    });
  });
  await page.goto("/__test__/auth-confirm#token_hash=test-only-token");
  await expect(
    page.getByRole("button", { name: "Continue to your cinema" }),
  ).toBeEnabled();
  expect(page.url()).not.toContain("token_hash");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Continue to your cinema" }).click();
  await expect(page.getByRole("alert")).toContainText("fresh email");
  expect(requests).toBe(1);
  expect(body).toMatchObject({ token_hash: "test-only-token", type: "email" });
});


test("A successful sign-in survives reload and a new tab", async ({ page, context }) => {
  const now = Math.floor(Date.now() / 1000);
  const user = { id: "12345678-1234-4234-8234-123456789abc", aud: "authenticated", role: "authenticated", email: "viewer@example.com", email_confirmed_at: new Date().toISOString(), app_metadata: {provider:"email"}, user_metadata: {}, created_at: new Date().toISOString(), is_anonymous: false };
  const jwt = [ {alg:"HS256",typ:"JWT"}, {sub:user.id,aud:"authenticated",exp:now+3600,iat:now,role:"authenticated",is_anonymous:false}, "test-signature" ].map((part) => Buffer.from(typeof part === "string" ? part : JSON.stringify(part)).toString("base64url")).join(".");
  await page.route("https://auth-test.supabase.co/auth/v1/verify", (r) => r.fulfill({json:{access_token:jwt,refresh_token:"test-refresh-token",token_type:"bearer",expires_in:3600,user}}));
  await page.route("**/create", (r) => r.fulfill({contentType:"text/html",body:"Signed in"}));
  await page.goto("/__test__/auth");
  await page.getByLabel("Email address").fill("viewer@example.com");
  await page.getByRole("button",{name:"I already have an email code"}).click();
  await page.getByLabel("Email code").fill("12345678");
  await page.getByRole("button",{name:"Sign in with code"}).click();
  await expect(page).toHaveURL(/\/create$/);
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name.includes("auth-token") && c.expires > now)).toBe(true);
  await page.goto("/__test__/auth-navbar");
  await expect(page.getByRole("link",{name:"My account"})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link",{name:"My account"})).toBeVisible();
  const another = await context.newPage();
  await another.route("**/__test__/auth-navbar", (r) => r.fulfill({contentType:"text/html",body:'<div id="root"></div><script src="/__test__/auth-bundle.js"></script>'}));
  await another.route("**/__test__/auth-bundle.js", (r) => r.fulfill({contentType:"text/javascript",body:bundle}));
  await another.route("https://auth-test.supabase.co/**", (r) => r.abort());
  await another.goto("/__test__/auth-navbar");
  await expect(another.getByRole("link",{name:"My account"})).toBeVisible();
});
