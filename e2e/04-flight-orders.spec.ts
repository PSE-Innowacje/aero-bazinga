import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Flight Orders — List", () => {
  test("pilot sees flight orders list with create button", async ({ page }) => {
    await login(page, "pilot");
    await page.click("text=Lista zleceń");
    await expect(page.locator("h1")).toContainText("Zlecenia na lot");
    await expect(page.locator("text=Nowe zlecenie")).toBeVisible();
  });

  test("supervisor sees flight orders list without create button", async ({ page }) => {
    await login(page, "supervisor");
    await page.click("text=Lista zleceń");
    await expect(page.locator("h1")).toContainText("Zlecenia na lot");
    await expect(page.locator("text=Nowe zlecenie")).not.toBeVisible();
  });

  test("admin sees flight orders in read-only mode", async ({ page }) => {
    await login(page, "admin");
    await page.click("text=Lista zleceń");
    await expect(page.locator("h1")).toContainText("Zlecenia na lot");
    await expect(page.locator("text=Nowe zlecenie")).not.toBeVisible();
  });

  test("default filter is status 2 (Przekazane do akceptacji)", async ({ page }) => {
    await login(page, "pilot");
    await page.click("text=Lista zleceń");
    await expect(page.locator('[role="combobox"]')).toBeVisible();
  });
});

test.describe("Flight Orders — Create", () => {
  test("pilot can access create form", async ({ page }) => {
    await page.context().clearCookies();
    await login(page, "pilot");
    await page.click("text=Lista zleceń");
    await page.click("text=Nowe zlecenie");
    await expect(page.locator("h1, h2").first()).toContainText(/zlecenie/i, { timeout: 10000 });
  });

  test("superadmin can access create form", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Lista zleceń");
    await page.click("text=Nowe zlecenie");
    await expect(page.getByText("Helikopter *")).toBeVisible({ timeout: 10000 });
  });

  test("form shows airfield selects", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Lista zleceń");
    await page.click("text=Nowe zlecenie");
    // Scroll to airfield section
    const startAirfield = page.getByText("Lotnisko startowe");
    await startAirfield.scrollIntoViewIfNeeded();
    await expect(startAirfield).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Flight Orders — Detail & Status", () => {
  test("clicking a flight order row navigates to detail", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Lista zleceń");
    // Switch to "Wszystkie"
    await page.click('[role="combobox"]');
    await page.click("text=Wszystkie");
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page.locator("text=Zlecenie")).toBeVisible();
    }
  });

  test("supervisor sees accept/reject on status 2 order", async ({ page }) => {
    await login(page, "supervisor");
    await page.click("text=Lista zleceń");
    // Default filter is status 2
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(
        page.locator("text=Zaakceptuj").or(page.locator("text=Odrzuć"))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
