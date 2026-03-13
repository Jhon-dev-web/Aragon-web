import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do frontend. Requer antes de rodar:
 * - Frontend: npm run dev (em outro terminal)
 * - Backend: rodando em API_BACKEND_URL (default http://127.0.0.1:8000)
 * - Usuários de teste: admin@test.com (role admin) e user@test.com (role user), senha "pass"
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
