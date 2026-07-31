import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — E2E browser tests.
 *
 * Asume que el stack docker compose está corriendo en :3001 / :8001.
 * Para CI levantamos compose como precondición.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: process.env.PW_BASE_URL || "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Si nadie hace docker compose up, podríamos arrancar el dev server.
  // Para nuestro setup esperamos que el stack ya corra.
});
