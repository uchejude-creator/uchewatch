import { test, expect } from "@playwright/test";
const widths = [375, 430, 768, 820, 1024, 1440];
test("Public screens render cleanly at each requested width", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/create",
    "/join",
    "/sign-in",
    "/room/11111111-1111-4111-8111-111111111111",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test("Room draft validation and unconfigured state are honest", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .getByLabel("YouTube link")
    .fill("https://attacker.test/watch?v=dQw4w9WgXcQ");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "doesn’t look like a YouTube link",
  );
  await page.route("**/api/video?*", (route) =>
    route.fulfill({
      json: { id: "dQw4w9WgXcQ", title: "A video for our night" },
    }),
  );
  await page.getByLabel("YouTube link").fill("https://youtu.be/dQw4w9WgXcQ");
  await expect(page.getByText("A video for our night")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Room", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("Your cinema is almost ready.")).toBeVisible();
});
test("Mobile navigation, guest form, callback failure, and invalid route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Join a room" })
    .click();
  await expect(
    page.getByRole("heading", { name: "You’re invited to watch together." }),
  ).toBeVisible();
  await page.getByLabel("Your display name").fill("Alex");
  await page
    .getByLabel("Room code or invitation link")
    .fill("https://example.test/room/11111111-1111-4111-8111-111111111111");
  await expect(page.getByLabel("Room code or invitation link")).toHaveValue(
    "11111111-1111-4111-8111-111111111111",
  );
  await page.goto("/sign-in?error=callback");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "expired",
  );
  await page.goto("/room/not-a-room");
  await expect(
    page.getByRole("heading", { name: "This seat hasn’t been saved." }),
  ).toBeVisible();
});
test("Manifest, icons, metadata endpoint validation and reduced-motion", async ({
  page,
  request,
}) => {
  expect(
    (await request.get("/api/video?url=https://attacker.test")).status(),
  ).toBe(400);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).status()).toBe(200);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});
