/// <reference lib="dom" />
// O page.evaluate roda no navegador, por isso os tipos do DOM
import { expect, test } from "@playwright/test";

test("cadastro, busca, registro de visita e diário", async ({ page }) => {
  const username = `e2e${Date.now().toString(36)}`;
  const senha = "uma-senha-bem-forte-e2e";

  // 1. Cadastro
  await page.goto("/cadastro");
  await page.getByLabel("Nome de usuário").fill(username);
  await page.getByLabel("E-mail").fill(`${username}@example.com`);
  await page.getByLabel("Senha").fill(senha);
  await page.getByLabel("Li e aceito os termos de uso e a política de privacidade").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL("/");

  // 2. Busca
  const busca = page.getByRole("searchbox", { name: "Buscar restaurante" });
  await busca.fill("aprazivel");
  await busca.press("Enter");
  await page.getByRole("link", { name: "Aprazível" }).first().click();
  await expect(page.getByRole("heading", { name: "Aprazível", level: 1 })).toBeVisible();

  // 3. Desejo: guarda e aparece na aba do perfil
  const desejo = page.getByRole("button", { name: "Desejo" });
  await desejo.click();
  await expect(desejo).toHaveAttribute("aria-pressed", "true");
  const paginaDoRestaurante = page.url();
  await page.goto(`/u/${username}`);
  await page.getByRole("tab", { name: "Desejos" }).click();
  await expect(page.getByRole("tabpanel").getByRole("link", { name: /Aprazível/ })).toBeVisible();
  await page.goto(paginaDoRestaurante);

  // 4. Registro de visita (tira o restaurante dos desejos)
  await page.getByRole("button", { name: "Registrar visita" }).click();
  const nota = page.getByRole("slider", { name: "Nota" });
  await nota.focus();
  for (let i = 0; i < 7; i++) await nota.press("ArrowRight");
  await expect(nota).toHaveAttribute("aria-valuetext", "3,5 de 5 estrelas");
  await page.getByRole("textbox", { name: "Crítica" }).fill("Teste automatizado.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // 5. Diário, e os desejos já vazios
  await page.goto(`/u/${username}`);
  await expect(page.getByRole("link", { name: "Aprazível" })).toBeVisible();
  await page.getByRole("tab", { name: "Desejos" }).click();
  await expect(page.getByText(/Você ainda não guardou restaurantes/)).toBeVisible();

  // 6. No celular, nada pode alargar a página além da tela
  const semRolagemLateral = async () => {
    const larguras = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      tela: document.documentElement.clientWidth,
    }));
    expect(larguras.pagina).toBeLessThanOrEqual(larguras.tela);
  };
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(paginaDoRestaurante);
  await expect(page.getByRole("button", { name: "Desejo" })).toBeVisible();
  await semRolagemLateral();
  await page.goto(`/u/${username}`);
  await page.getByRole("tab", { name: "Desejos" }).click();
  await semRolagemLateral();
  await page.goto("/configuracoes");
  await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
  await semRolagemLateral();

  // 7. Limpeza: exclui a conta criada
  await page.getByRole("button", { name: "Excluir conta" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Sua senha").fill(senha);
  await dialogo.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(page).toHaveURL("/");
});
