/**
 * Fluxo de autorização do painel admin.
 * Requer backend com usuários: admin@test.com e user@test.com (senha "pass");
 * admin@test.com deve ter role=admin (ex.: ADMIN_EMAIL=admin@test.com no backend).
 */
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.com";
const USER_EMAIL = "user@test.com";
const PASSWORD = "pass";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/login");
  await page.getByPlaceholder("seu@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/probabilisticas/, { timeout: 15_000 });
}

test.describe("Autorização painel admin", () => {
  test("usuário admin vê navegação para /admin", async ({ page }) => {
    await login(page, ADMIN_EMAIL, PASSWORD);
    const adminLink = page.getByRole("link", { name: "Admin" });
    await expect(adminLink).toBeVisible();
    await expect(adminLink).toHaveAttribute("href", "/admin");
  });

  test("usuário comum não vê navegação para /admin", async ({ page }) => {
    await login(page, USER_EMAIL, PASSWORD);
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();
  });

  test("acesso manual de usuário comum a /admin gera redirecionamento", async ({ page }) => {
    await login(page, USER_EMAIL, PASSWORD);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/probabilisticas/, { timeout: 10_000 });
  });

  test("a página admin não dispara carregamento de dados sem permissão", async ({ page }) => {
    const adminRequests: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("/admin/users") || u.includes("/admin/promo/codes")) {
        adminRequests.push(u);
      }
    });

    await login(page, USER_EMAIL, PASSWORD);
    adminRequests.length = 0;
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/probabilisticas/, { timeout: 10_000 });

    expect(
      adminRequests,
      "Não deve haver requisições a /admin/users ou /admin/promo/codes antes do redirect"
    ).toHaveLength(0);
  });
});
