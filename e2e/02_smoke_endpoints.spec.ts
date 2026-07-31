import { test, expect } from "@playwright/test";

/**
 * Smoke de los endpoints públicos del gateway. Verifica que los services
 * estén respondiendo (aunque sea 401 por falta de auth, lo cual demuestra
 * que el routing funciona).
 */

test.describe("Gateway routing", () => {
  const apiBase = process.env.PW_API_URL || "http://localhost:8001";

  const protectedEndpoints = [
    "/api/dashboard/bi/overview",
    "/api/dashboard/me/portal",
    "/api/predictions/attrition/all",
    "/api/predictions/comp/overview",
    "/api/reviews/cycles",
  ];

  for (const ep of protectedEndpoints) {
    test(`${ep} responde 401 sin auth (routing OK)`, async ({ request }) => {
      const res = await request.get(`${apiBase}${ep}`);
      expect([401, 403]).toContain(res.status());
    });
  }

  test("frontend assets se sirven con content-type correcto", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] || "";
    expect(contentType).toMatch(/html/);
  });
});
