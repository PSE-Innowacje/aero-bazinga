import { Page } from "@playwright/test";

// All test users use the same known password set by e2e-seed
// If you only have the default admin, only "superadmin" will work.
// Run: psql -d aero -c "UPDATE users SET password_hash = (SELECT password_hash FROM users WHERE email = 'admin@aero.local') WHERE email != 'admin@aero.local';"
// to reset all passwords to Admin123!
export const USERS = {
  superadmin: { email: "admin@aero.local", password: "Admin123!" },
  admin: { email: "kuba@admin.test", password: "Admin123!" },
  planner: { email: "kuba@planer.test", password: "Admin123!" },
  supervisor: { email: "kuba@nadzorca.test", password: "Admin123!" },
  pilot: { email: "kuba@pilot.test", password: "Admin123!" },
};

export async function login(page: Page, role: keyof typeof USERS) {
  const { email, password } = USERS[role];
  // Retry navigation — Vite HMR can cause ERR_ABORTED on first load
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto("/login", { waitUntil: "commit", timeout: 15000 });
      break;
    } catch {
      if (attempt === 2) throw new Error("Failed to navigate to /login after 3 attempts");
      await page.waitForTimeout(1000);
    }
  }
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Witaj", { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.click("text=Wyloguj się");
  await page.waitForURL("**/login");
}
