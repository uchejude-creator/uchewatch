import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
test("Actual watch-room components fit phone, iPad, and desktop layouts", async ({
  page,
}) => {
  await page.goto("/");
  const styles = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href),
    );
  const bodyClass = await page.locator("body").getAttribute("class");
  // Only a static layout fixture. No fake room is exposed in the app, and no
  // network or playback success is inferred from this layout test.
  execFileSync("node_modules/.bin/esbuild", [
    "e2e/render-room.tsx",
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--packages=external",
    "--outfile=test-results/room-render.cjs",
  ]);
  const markup = execFileSync(
    process.execPath,
    ["test-results/room-render.cjs"],
    { encoding: "utf8" },
  );
  await page.route("**/__test__/room-layout", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body class="${bodyClass}">${markup}</body></html>`,
    }),
  );
  await page.goto("/__test__/room-layout");
  for (const width of [375, 430, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole("heading", { name: "Our little movie night" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `room at ${width}`,
    ).toBe(true);
    const frame = await page.locator(".player-frame").boundingBox();
    expect(frame!.height).toBeGreaterThanOrEqual(200);
    if (width < 901) {
      const panel = await page.locator(".social-panel").boundingBox();
      expect(panel!.y).toBeGreaterThan(frame!.y + frame!.height);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/room-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.screenshot({ path: "test-results/room-ipad.png", fullPage: true });
});
