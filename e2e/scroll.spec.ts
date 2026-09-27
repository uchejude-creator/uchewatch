import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
test("Movie stays visible while games scroll without recreating the player", async ({
  page,
}) => {
  const bundle = (
    await build({
      entryPoints: ["e2e/scroll-harness.tsx"],
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_APP_NAME": '"UcheWatch"' },
    })
  ).outputFiles[0].text;
  await page.goto("/");
  const styles = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLLinkElement).href));
  await page.addInitScript({
    content: readFileSync("e2e/youtube-stub.js", "utf8"),
  });
  await page.route("**/__test__/scroll.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: bundle }),
  );
  await page.route("**/__test__/scroll", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}<div id="root"></div><script src="/__test__/scroll.js"></script>`,
    }),
  );
  await page.goto("/__test__/scroll");
  await expect(
    page.getByRole("button", { name: "Play for everyone", exact: true }),
  ).toBeEnabled();
  await page
    .locator("iframe")
    .evaluate((el) => el.setAttribute("data-original-player", "yes"));
  await page.getByRole("button", { name: /Our little extras/ }).click();
  await page
    .getByRole("button", { name: "Play together", exact: true })
    .click();
  for (const width of [375, 430, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelector(".room-companion")!.scrollTop = 0;
    });
    await expect(page.locator(".watch-screen-slot")).not.toHaveClass(
      /screen-pinned/,
    );
    if (width <= 1100) {
      await page.evaluate(() => window.scrollTo(0, 900));
      await expect(page.locator(".watch-screen-slot")).toHaveClass(
        /screen-pinned/,
      );
    } else {
      await page
        .locator(".room-companion")
        .evaluate((el) => (el.scrollTop = 900));
    }
    const video = await page.locator(".watch-screen").boundingBox();
    expect(video!.y).toBeGreaterThanOrEqual(-1);
    expect(video!.y + video!.height).toBeLessThan(1000);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator('iframe[data-original-player="yes"]'),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Play for everyone", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Pause for everyone", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Pause for everyone", exact: true })
      .click();
    if (width === 820 || width === 1440)
      await page.screenshot({
        path: `test-results/scroll-${width}-${test.info().project.name}.png`,
      });
  }
  await page.setViewportSize({ width: 820, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(page.locator(".watch-screen-slot")).toHaveClass(/screen-pinned/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(".watch-screen-slot")).not.toHaveClass(
    /screen-pinned/,
  );
  await expect(page.locator('iframe[data-original-player="yes"]')).toHaveCount(
    1,
  );
});
