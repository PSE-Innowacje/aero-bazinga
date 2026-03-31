import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin — Helicopters CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "superadmin");
  });

  test("displays helicopters list", async ({ page }) => {
    await page.click("text=Helikoptery");
    await expect(page.locator("h1")).toContainText("Helikoptery");
    await expect(page.locator("table")).toBeVisible();
  });

  test("can navigate to create helicopter form", async ({ page }) => {
    await page.click("text=Helikoptery");
    await page.click("text=Dodaj helikopter");
    await expect(page.locator("h1")).toContainText("helikopter");
    // Verify form fields are present
    await expect(page.locator('input[name="registration_number"]')).toBeVisible();
    await expect(page.locator('input[name="type"]')).toBeVisible();
  });

  test("supervisor sees helicopters list without edit buttons", async ({ page }) => {
    // Fresh page — don't reuse superadmin session
    await page.context().clearCookies();
    await login(page, "supervisor");
    await page.click("text=Helikoptery");
    await expect(page.locator("h1")).toContainText("Helikoptery");
    await expect(page.locator("text=Dodaj helikopter")).not.toBeVisible();
  });
});

test.describe("Admin — Crew Members CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "superadmin");
  });

  test("displays crew list", async ({ page }) => {
    await page.click("text=Członkowie załogi");
    await expect(page.locator("h1")).toContainText("Członkowie załogi");
    await expect(page.locator("table")).toBeVisible();
  });

  test("can navigate to create crew member form", async ({ page }) => {
    await page.click("text=Członkowie załogi");
    await page.click("text=Dodaj członka załogi");
    await expect(page.locator("h1")).toContainText("członek załogi");
    await expect(page.locator('input[name="first_name"]')).toBeVisible();
  });
});

test.describe("Admin — Airfields CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "superadmin");
  });

  test("displays airfields list", async ({ page }) => {
    await page.click("text=Lądowiska planowe");
    await expect(page.locator("h1")).toContainText("Lądowiska planowe");
  });

  test("can navigate to create airfield form", async ({ page }) => {
    await page.click("text=Lądowiska planowe");
    await page.click("text=Dodaj lądowisko");
    await expect(page.locator("h1")).toContainText("lądowisko");
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });
});

test.describe("Admin — Users CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "superadmin");
  });

  test("displays users list", async ({ page }) => {
    await page.click("text=Użytkownicy");
    await expect(page.locator("h1")).toContainText("Użytkownicy");
    await expect(page.locator("table")).toBeVisible();
  });

  test("has permissions tab", async ({ page }) => {
    await page.click("text=Użytkownicy");
    await expect(page.locator("text=Uprawnienia ról")).toBeVisible();
  });
});
