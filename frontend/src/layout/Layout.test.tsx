import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { cidadeRio, eu } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

function cabecalho() {
  return within(screen.getByRole("navigation", { name: "Principal" }));
}

test("anônimo vê Entrar e Criar conta", () => {
  renderizar(undefined, { rota: "/termos" });

  expect(cabecalho().getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
  expect(cabecalho().getByRole("link", { name: "Criar conta" })).toHaveAttribute(
    "href",
    "/cadastro",
  );
});

test("logado vê o perfil, as configurações e o botão de sair", () => {
  renderizar(undefined, { rota: "/termos", usuario: eu });

  expect(cabecalho().getByRole("link", { name: "Meu perfil" })).toHaveAttribute("href", "/u/ana");
  expect(cabecalho().getByRole("link", { name: "Configurações" })).toHaveAttribute(
    "href",
    "/configuracoes",
  );
  expect(cabecalho().getByRole("button", { name: "Sair" })).toBeInTheDocument();
});

test("rota protegida manda para o login", () => {
  renderizar(undefined, { rota: "/configuracoes" });

  expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
});

test("rota desconhecida mostra página não encontrada", () => {
  renderizar(undefined, { rota: "/nao-existe" });

  expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
});

test("sair numa página protegida vai para o início, não para o login", async () => {
  servidor.use(
    http.get("*/api/v1/cidades", () => HttpResponse.json([cidadeRio])),
    http.post("*/api/v1/auth/logout", () => new HttpResponse(null, { status: 204 })),
  );
  const { evento } = renderizar(undefined, { rota: "/configuracoes", usuario: eu });

  await evento.click(cabecalho().getByRole("button", { name: "Sair" }));

  expect(
    await screen.findByRole("heading", { name: "Onde você comeu hoje?", level: 1 }),
  ).toBeVisible();
});
