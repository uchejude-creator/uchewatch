import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
let script = "";
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["e2e/player-harness.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_APP_NAME": '"UcheWatch"',
    },
    jsx: "automatic",
  });
  script = result.outputFiles[0].text;
});
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const styles = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  const bodyClass = await page.locator("body").getAttribute("class");
  await page.addInitScript({
    content: readFileSync("e2e/youtube-stub.js", "utf8"),
  });
  await page.route("**/__test__/bundle.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: script }),
  );
  await page.route("**/__test__/player", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta charset="utf-8">${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body class="${bodyClass}"><div id="root"></div><script src="/__test__/bundle.js"></script></body></html>`,
    }),
  );
  await page.goto("/__test__/player");
  await expect(
    page
      .getByRole("region", { name: "Host player" })
      .getByRole("button", { name: "Play for everyone" }),
  ).toBeEnabled();
});
test("Play, pause and seek propagate without remote feedback commands", async ({
  page,
}) => {
  const host = page.getByRole("region", { name: "Host player" }),
    guest = page.getByRole("region", { name: "Guest player" }),
    count = page.getByLabel("Playback command count");
  await host.getByRole("button", { name: "Play for everyone" }).click();
  await expect(
    guest.getByRole("button", { name: "Pause for everyone" }),
  ).toBeVisible();
  await expect(count).toHaveText("1");
  await guest.getByRole("button", { name: "Pause for everyone" }).click();
  await expect(
    host.getByRole("button", { name: "Play for everyone" }),
  ).toBeVisible();
  await expect(count).toHaveText("2");
  await page.getByRole("button", { name: "Simulate remote seek" }).click();
  await expect(host.getByText("0:42 / 3:00")).toBeVisible();
  await expect(guest.getByText("0:42 / 3:00")).toBeVisible();
  await guest.getByRole("slider", { name: "Seek video for everyone" }).focus();
  await guest
    .getByRole("slider", { name: "Seek video for everyone" })
    .press("End");
  await expect(host.getByText("3:00 / 3:00")).toBeVisible();
  await expect(count).toHaveText("3");
  await page.waitForTimeout(5500);
  await expect(count).toHaveText("3");
});
test("Chat preserves failed drafts and invitation dialogs restore focus", async ({
  page,
}) => {
  await page.getByLabel("Simulate send failure").check();
  await page
    .getByRole("textbox", { name: "Your message" })
    .fill("Glad you are here");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("wasn’t sent");
  await expect(page.getByRole("textbox", { name: "Your message" })).toHaveValue(
    "Glad you are here",
  );
  await page.getByLabel("Simulate send failure").uncheck();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText("Glad you are here");
  await expect(page.getByRole("textbox", { name: "Your message" })).toBeEmpty();
  // Safari deliberately does not focus buttons on mouse click. Exercise the
  // keyboard flow so the dialog has a focused trigger to restore on Escape.
  await page.getByRole("button", { name: "Open invitation" }).focus();
  await page.getByRole("button", { name: "Open invitation" }).press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Invitation link", exact: true }),
  ).toHaveValue(/\/room\/11111111/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open invitation" }),
  ).toBeFocused();
});

test("Love collection sends selected emojis to the player and fits every device width", async ({
  page,
}) => {
  await page.getByRole("button", { name: "More emojis", exact: true }).click();
  const collection = page.locator("#emoji-collection");
  await expect(collection.getByRole("button")).toHaveCount(44);
  for (const width of [375, 430, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await collection.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  await collection
    .getByRole("button", { name: "Send 💞 reaction", exact: true })
    .click();
  await collection
    .getByRole("button", { name: "Send 💋 reaction", exact: true })
    .click();
  const player = page.getByRole("region", { name: "Host player" });
  await expect(player.locator(".floating-reaction")).toHaveText(["💞", "💋"]);
  await page
    .getByRole("button", { name: "Close emoji collection", exact: true })
    .click();
  await expect(collection).toHaveCount(0);
});

test("A future shared start pauses both players until the authoritative deadline", async ({
  page,
}) => {
  const host = page.getByRole("region", { name: "Host player" });
  const guest = page.getByRole("region", { name: "Guest player" });
  await page.getByRole("button", { name: "Schedule shared start" }).click();
  await expect(
    host.getByRole("button", { name: "Play for everyone" }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", { name: "Play for everyone" }),
  ).toBeVisible();
  await expect(
    host.getByRole("button", { name: "Pause for everyone" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    guest.getByRole("button", { name: "Pause for everyone" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(page.getByLabel("Playback command count")).toHaveText("0");
});
