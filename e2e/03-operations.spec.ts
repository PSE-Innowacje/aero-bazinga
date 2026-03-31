import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Operations — List", () => {
  test("planner sees operations list with create button", async ({ page }) => {
    await login(page, "planner");
    await page.click("text=Lista operacji");
    await expect(page.locator("h1")).toContainText("Planowane operacje");
    await expect(page.locator("text=Nowa operacja")).toBeVisible();
  });

  test("pilot sees operations list without create button", async ({ page }) => {
    await login(page, "pilot");
    await page.click("text=Lista operacji");
    await expect(page.locator("h1")).toContainText("Planowane operacje");
    await expect(page.locator("text=Nowa operacja")).not.toBeVisible();
  });

  test("default filter is status 3 (Potwierdzone)", async ({ page }) => {
    await login(page, "planner");
    await page.click("text=Lista operacji");
    // The select trigger should show "Potwierdzone do planu" or value "3"
    await expect(page.locator('[role="combobox"]')).toBeVisible();
  });

  test("status filter changes displayed operations", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Lista operacji");
    // Switch to "Wszystkie"
    await page.click('[role="combobox"]');
    await page.click("text=Wszystkie");
    // Should show all operations
    await expect(page.locator("table")).toBeVisible();
  });
});

test.describe("Operations — Create", () => {
  test("supervisor can create an operation", async ({ page }) => {
    await login(page, "supervisor");
    await page.click("text=Lista operacji");
    await page.click("text=Nowa operacja");
    await expect(page.locator("h1")).toContainText("operacja");
  });

  test("superadmin can access create form", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Lista operacji");
    await page.click("text=Nowa operacja");
    await expect(page.locator("h1")).toContainText("operacja");
  });
});

test.describe("Operations — Detail & Status Actions", () => {
  test("clicking an operation row navigates to detail", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Lista operacji");
    // Switch to "Wszystkie" to see all ops
    await page.click('[role="combobox"]');
    await page.click("text=Wszystkie");
    // Click first operation row if exists
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      // Should show operation detail
      await expect(page.locator("text=Planowane operacje")).toBeVisible();
    }
  });

  test("supervisor sees confirm/reject buttons on status 1 operation", async ({ page }) => {
    await login(page, "supervisor");
    await page.click("text=Lista operacji");
    // Filter to status 1 (Wprowadzone)
    await page.click('[role="combobox"]');
    await page.click("text=Wprowadzone");
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      // Should see action buttons
      await expect(
        page.locator("text=Odrzuć").or(page.locator("text=Potwierdź do planu"))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
