import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
let bundle = "";
const host = "11111111-1111-4111-8111-111111111111",
  guest = "22222222-2222-4222-8222-222222222222";
test.beforeAll(async () => {
  bundle = (
    await build({
      entryPoints: ["e2e/fun-harness.tsx"],
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      jsx: "automatic",
      define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.NEXT_PUBLIC_APP_NAME": '"UcheWatch"',
      },
    })
  ).outputFiles[0].text;
});
async function setup(page: Page) {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema realtime;create table auth.users(id uuid primary key,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create table realtime.messages(id bigint,extension text,topic text);alter table realtime.messages enable row level security;create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true);$$;grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;create publication supabase_realtime;`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query(
    "insert into auth.users(id,is_anonymous) values($1,false),($2,true)",
    [host, guest],
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [host]);
  const room = (
    await db.query<{ id: string; room_code: string }>(
      "select * from public.create_watch_room('Fixture','M7lc1UVf-VE')",
    )
  ).rows[0];
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    guest,
  ]);
  await db.query("select public.join_watch_room($1,'Sam')", [room.room_code]);
  await page.goto("/");
  const styles = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLLinkElement).href));
  let queue = Promise.resolve();
  await page.context().route("**/__test__/fun-api", async (route) => {
    const { action, data, userId } = route.request().postDataJSON();
    queue = queue.then(async () => {
      try {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          userId,
        ]);
        await db.exec("set role authenticated");
        const result = await db.query<{ state: unknown }>(
          "select * from public.fun_action($1,$2,$3::jsonb,$4)",
          [room.id, action, JSON.stringify(data), randomUUID()],
        );
        await route.fulfill({ json: result.rows[0].state });
      } catch (e) {
        await route.fulfill({ status: 400, json: { error: String(e) } });
      }
    });
    await queue;
  });
  await page
    .context()
    .route("**/__test__/fun-bundle.js", (r) =>
      r.fulfill({ contentType: "text/javascript", body: bundle }),
    );
  await page.context().route("**/__test__/fun?*", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}<div id="root"></div><script src="/__test__/fun-bundle.js"></script>`,
    }),
  );
  await page.goto(`/__test__/fun?user=${host}`);
  const other = await page.context().newPage();
  await other.goto(`/__test__/fun?user=${guest}`);
  await page.getByRole("button", { name: /Our little extras/ }).click();
  await other.getByRole("button", { name: /Our little extras/ }).click();
  return { other, close: () => db.close() };
}
test("Love bursts, notes, moods and snack status reach the other screen", async ({
  page,
}) => {
  const { other, close } = await setup(page);
  try {
    await page.getByRole("button", { name: "Send a love burst" }).click();
    await expect(other.locator(".love-burst")).toHaveCount(1);
    await page
      .getByLabel("A little note on their screen")
      .fill("You are my favorite scene");
    await page
      .getByRole("button", { name: "Send a little love", exact: true })
      .click();
    await expect(other.locator(".screen-love-note")).toContainText(
      "You are my favorite scene",
    );
    await page.getByRole("button", { name: "rose", exact: true }).click();
    await expect(other.locator("main")).toHaveClass(/room-mood-rose/);
    await page.getByRole("button", { name: /Snack break Let/ }).click();
    await expect(other.locator(".snack-status")).toContainText(
      "Alex is getting snacks",
    );
    await expect(other.locator(".love-burst")).toHaveCount(0, {
      timeout: 10000,
    });
  } finally {
    await close();
  }
});
test("Secret answers reveal together, then a shared goodnight pauses the room", async ({
  page,
}) => {
  const { other, close } = await setup(page);
  try {
    await page
      .getByRole("button", { name: "Play together", exact: true })
      .click();
    await other
      .getByRole("button", { name: "Play together", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start secret compliments", exact: true })
      .click();
    await page
      .getByLabel("Your private answer")
      .fill("You light up my evening");
    await page.getByRole("button", { name: "Lock in my answer" }).click();
    await expect(
      other.getByText("You light up my evening", { exact: true }),
    ).toHaveCount(0);
    await other.getByLabel("Your private answer").fill("You make me smile");
    await other.getByRole("button", { name: "Lock in my answer" }).click();
    await expect(page.locator(".answer-reveal")).toContainText(
      "You make me smile",
    );
    await expect(other.locator(".answer-reveal")).toContainText(
      "You light up my evening",
    );
    await page.getByRole("button", { name: /Our goodnight Exchange/ }).click();
    await page
      .getByRole("button", { name: "Start our goodnight", exact: true })
      .click();
    await page.getByLabel("Your private answer").fill("Sweet dreams");
    await page.getByRole("button", { name: "Lock in my answer" }).click();
    await other.getByLabel("Your private answer").fill("Until tomorrow");
    await other.getByRole("button", { name: "Lock in my answer" }).click();
    await expect(page.locator(".goodnight-card")).toContainText(
      "Until tomorrow",
    );
    await expect(other.locator("main")).toHaveClass(/night-mode/);
  } finally {
    await close();
  }
});
test("The corner fits each requested width and playlist dedications reach both people", async ({
  page,
}) => {
  const { other, close } = await setup(page);
  try {
    for (const width of [375, 430, 768, 820, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const label of [
        "Little moments",
        "Up next",
        "Play together",
        "Keepsakes",
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${label} at ${width}`,
        ).toBe(true);
      }
    }
    await page.setViewportSize({ width: 820, height: 1100 });
    await page
      .getByRole("button", { name: "Little moments", exact: true })
      .click();
    await page.screenshot({
      path: `test-results/date-night-${test.info().project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Up next", exact: true }).click();
    await other.getByRole("button", { name: "Up next", exact: true }).click();
    await page
      .getByLabel("YouTube link", { exact: true })
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByLabel("Give your pick a name").fill("Our song tonight");
    await page
      .getByLabel(/This reminded me/)
      .fill("It always makes me think of you");
    await page.getByRole("button", { name: "Add to our night" }).click();
    await expect(other.locator(".playlist-pick")).toContainText(
      "It always makes me think of you",
    );
  } finally {
    await close();
  }
});

test("Two truths uses three fields and reveals lies only after both guesses", async ({
  page,
}) => {
  const { other, close } = await setup(page);
  try {
    for (const view of [page, other])
      await view
        .getByRole("button", { name: "Play together", exact: true })
        .click();
    await page
      .getByRole("button", { name: /Two truths & a lie Trade/ })
      .click();
    await expect(page.getByLabel("Tonight’s question")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Start two truths & a lie", exact: true })
      .click();
    for (const [index, view] of [page, other].entries()) {
      const submit = view.getByRole("button", {
        name: "Lock in my three statements",
      });
      await view
        .getByLabel("Statement 1", { exact: true })
        .fill(`I swim ${index}`);
      await expect(submit).toBeDisabled();
      await view
        .getByLabel("Statement 2", { exact: true })
        .fill(`I fly ${index}`);
      await view
        .getByLabel("Statement 3", { exact: true })
        .fill(`I cook ${index}`);
      await expect(submit).toBeDisabled();
      await view
        .getByLabel("Which statement is your lie? (kept secret)")
        .selectOption("2");
      await submit.click();
      if (index === 0)
        await expect(other.locator(".answer-reveal")).toHaveCount(0);
    }
    await expect(page.locator(".answer-reveal")).toContainText("3. I cook 1");
    await page
      .getByRole("button", { name: "Statement 2", exact: true })
      .click();
    await expect(
      other.getByText("Statement 2 was the lie.", { exact: true }),
    ).toHaveCount(0);
    await other
      .getByRole("button", { name: "Statement 2", exact: true })
      .click();
    await expect(
      page.getByText("Statement 2 was the lie.", { exact: true }),
    ).toHaveCount(2);
  } finally {
    await close();
  }
});
