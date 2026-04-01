import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  timeout: 45000,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npm run dev:server",
      port: 3000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev:client",
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
