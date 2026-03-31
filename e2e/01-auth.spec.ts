import { test, expect } from "@playwright/test";
import { login, logout, USERS } from "./helpers";

test.describe("Authentication", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login form with Polish labels", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("AERO");
    await expect(page.locator("text=Zaloguj się")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test("logs in as superadmin and shows dashboard", async ({ page }) => {
    await login(page, "superadmin");
    await expect(page.locator("text=Witaj")).toBeVisible();
  });

  test("session persists after page refresh", async ({ page }) => {
    await login(page, "superadmin");
    await page.reload();
    await expect(page.locator("text=Witaj")).toBeVisible();
  });

  test("logout redirects to login page", async ({ page }) => {
    await login(page, "superadmin");
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("RBAC — Sidebar visibility", () => {
  test("superadmin sees all 3 sections", async ({ page }) => {
    await login(page, "superadmin");
    await expect(page.locator("aside").getByText("ADMINISTRACJA")).toBeVisible();
    await expect(page.locator("aside").getByText("PLANOWANIE OPERACJI")).toBeVisible();
    await expect(page.locator("aside").getByText("ZLECENIA NA LOT")).toBeVisible();
  });

  test("planner sees only Planowanie operacji", async ({ page }) => {
    await login(page, "planner");
    await expect(page.locator("aside").getByText("ADMINISTRACJA")).not.toBeVisible();
    await expect(page.locator("aside").getByText("PLANOWANIE OPERACJI")).toBeVisible();
    await expect(page.locator("aside").getByText("ZLECENIA NA LOT")).not.toBeVisible();
  });

  test("pilot does not see Administracja", async ({ page }) => {
    await login(page, "pilot");
    await expect(page.locator("aside").getByText("ADMINISTRACJA")).not.toBeVisible();
    await expect(page.locator("aside").getByText("ZLECENIA NA LOT")).toBeVisible();
  });

  test("supervisor sees Administracja, Operacje, Zlecenia", async ({ page }) => {
    await login(page, "supervisor");
    await expect(page.locator("aside").getByText("ADMINISTRACJA")).toBeVisible();
    await expect(page.locator("aside").getByText("PLANOWANIE OPERACJI")).toBeVisible();
    await expect(page.locator("aside").getByText("ZLECENIA NA LOT")).toBeVisible();
  });
});

test.describe("RBAC — Direct URL access", () => {
  test("planner cannot access /admin/helicopters", async ({ page }) => {
    await login(page, "planner");
    await page.goto("/admin/helicopters", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test("pilot cannot access /admin/users", async ({ page }) => {
    await login(page, "pilot");
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/unauthorized/);
  });
});
