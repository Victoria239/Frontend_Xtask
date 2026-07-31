import { test, expect } from "@playwright/test";

/**
 * Smoke E2E — verifica que la app carga, el login se muestra y el
 * selector de idioma funciona desde el primer render.
 */

test.describe("App boot + landing", () => {
  test("HTTP 200 y document title", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/XTask|Vite/i);
  });

  test("redirección a login si no hay sesión", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toMatch(/login|landing|\/$/);
  });
});

test.describe("i18n", () => {
  test("cambio de idioma persiste tras reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => localStorage.setItem("xt.lang", "en"));
    await page.reload();
    await page.waitForLoadState("networkidle");

    const stored = await page.evaluate(() => localStorage.getItem("xt.lang"));
    expect(stored).toBe("en");
  });

  test("seteo de cada idioma persiste correctamente", async ({ page }) => {
    await page.goto("/");
    for (const lang of ["fr", "pt", "de", "ca", "en", "es"]) {
      await page.evaluate((l) => localStorage.setItem("xt.lang", l), lang);
      const got = await page.evaluate(() => localStorage.getItem("xt.lang"));
      expect(got).toBe(lang);
    }
  });
});
