import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Permissions Editor", () => {
  test("admin can access permissions page", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Użytkownicy");
    await page.click("text=Uprawnienia ról");
    await expect(page.locator("text=Zapisz zmiany")).toBeVisible();
  });

  test("permissions table shows all 5 roles", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Użytkownicy");
    await page.click("text=Uprawnienia ról");
    await expect(page.locator("text=Superadministrator")).toBeVisible();
    await expect(page.locator("text=Administrator systemu")).toBeVisible();
    await expect(page.locator("text=Osoba planująca")).toBeVisible();
    await expect(page.locator("text=Osoba nadzorująca")).toBeVisible();
    await expect(page.locator("text=Pilot")).toBeVisible();
  });

  test("superadmin row is locked", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Użytkownicy");
    await page.click("text=Uprawnienia ról");
    // Superadmin cells should show "zablokowane"
    const lockedCells = page.locator("text=zablokowane");
    await expect(lockedCells.first()).toBeVisible();
  });

  test("tabs switch between users list and permissions", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Użytkownicy");
    // On users list
    await expect(page.locator("text=Lista użytkowników")).toBeVisible();
    // Switch to permissions
    await page.click("text=Uprawnienia ról");
    await expect(page.locator("text=Zapisz zmiany")).toBeVisible();
    // Switch back
    await page.click("text=Lista użytkowników");
    await expect(page.locator("table")).toBeVisible();
  });
});
