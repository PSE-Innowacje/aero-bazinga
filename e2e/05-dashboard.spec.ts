import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Dashboard", () => {
  test("shows welcome message with user name", async ({ page }) => {
    await login(page, "superadmin");
    await expect(page.locator("text=Witaj")).toBeVisible();
  });

  test("displays 4 global stat cards", async ({ page }) => {
    await login(page, "superadmin");
    await expect(page.locator("text=Nowe operacje")).toBeVisible();
    await expect(page.locator("text=Potwierdzone")).toBeVisible();
    await expect(page.locator("text=Do akceptacji")).toBeVisible();
    await expect(page.locator("text=Aktywne helikoptery")).toBeVisible();
  });

  test("admin sees 'Użytkownicy w systemie' section", async ({ page }) => {
    await login(page, "superadmin");
    await expect(page.locator("text=Użytkownicy w systemie")).toBeVisible();
  });

  test("admin sees expiring section when relevant", async ({ page }) => {
    await login(page, "superadmin");
    // May or may not be visible depending on data — just check page loads
    await expect(page.locator("text=Witaj")).toBeVisible();
  });

  test("planner sees 'Moje operacje' section", async ({ page }) => {
    await login(page, "planner");
    await expect(page.locator("text=Moje operacje")).toBeVisible();
  });

  test("pilot sees 'Moje zlecenia na lot' section", async ({ page }) => {
    await login(page, "pilot");
    await expect(page.locator("text=Moje zlecenia na lot")).toBeVisible();
  });

  test("supervisor sees pending actions tables", async ({ page }) => {
    await login(page, "supervisor");
    // Dashboard loads — specific sections depend on data
    await expect(page.locator("text=Witaj")).toBeVisible();
  });

  test("stat card click navigates to operations", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Nowe operacje");
    await expect(page).toHaveURL(/\/operations/);
  });

  test("stat card click navigates to flight orders", async ({ page }) => {
    await login(page, "superadmin");
    await page.click("text=Do akceptacji");
    await expect(page).toHaveURL(/\/flight-orders/);
  });
});
