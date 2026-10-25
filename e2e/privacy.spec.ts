import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

function testUserEmail(which: "A" | "B"): string {
  const email = process.env[`E2E_USER_${which}_EMAIL`];
  if (!email) throw new Error(`E2E_USER_${which}_EMAIL must be set in .env.local`);
  return email;
}

// Each person gets their own browser context, like two different laptops.
async function signedInPage(browser: Browser, which: "A" | "B"): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: testUserEmail(which) });
  await page.goto("/mood");
  return page;
}

// Returns the new pick's ID: the grid is oldest first, so it is the last square.
async function pickAPainting(page: Page, how: "click" | "dblclick" = "click"): Promise<string> {
  await page.getByRole("button", { name: "Painting 1 of 4" })[how]();
  await expect(page.getByRole("heading", { name: "Saved. Here's every mood so far." })).toBeVisible();
  const pickId = await page.locator("[data-pick-id]").last().getAttribute("data-pick-id");
  if (!pickId) throw new Error("The newest square has no data-pick-id");
  return pickId;
}

test("two people can't see each other's picks", async ({ browser }) => {
  const a = await signedInPage(browser, "A");
  const pickA = await pickAPainting(a);

  const b = await signedInPage(browser, "B");
  const pickB = await pickAPainting(b);
  await expect(b.locator(`[data-pick-id="${pickB}"]`)).toHaveCount(1);
  await expect(b.locator(`[data-pick-id="${pickA}"]`)).toHaveCount(0);

  await a.goto("/mood");
  await pickAPainting(a);
  await expect(a.locator(`[data-pick-id="${pickB}"]`)).toHaveCount(0);
});

test("a signed-out visitor sees no one's picks", async ({ page }) => {
  await page.goto("/mood");
  await page.waitForURL((url) => url.pathname !== "/mood");
  await expect(page.locator("[data-pick-id]")).toHaveCount(0);
});

test("double-clicking a painting saves one pick", async ({ browser }) => {
  const a = await signedInPage(browser, "A");
  await pickAPainting(a);
  const before = await a.locator("[data-pick-id]").count();

  await a.goto("/mood");
  await pickAPainting(a, "dblclick");
  await expect(a.locator("[data-pick-id]")).toHaveCount(before + 1);
});
