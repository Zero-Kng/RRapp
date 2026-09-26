import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, test } from "vitest";
import { definirAcesso } from "../api/sessao";
import { eu } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";
import { destinoSeguro } from "../util/destino";

afterEach(() => definirAcesso(null));

async function preencherEEnviar(evento: ReturnType<typeof renderizar>["evento"]) {
  await evento.type(screen.getByLabelText("E-mail ou usuário"), "ana");
  await evento.type(screen.getByLabelText("Senha"), "senha-forte-123");
  await evento.click(screen.getByRole("button", { name: "Entrar" }));
}

test("entra e volta para a página de origem", async () => {
  servidor.use(
    http.post("*/api/v1/auth/login", () => HttpResponse.json({ usuario: eu, acesso: "t" })),
  );
  const { evento } = renderizar(undefined, { rota: "/entrar?voltar=/termos" });

  await preencherEEnviar(evento);

  expect(await screen.findByRole("heading", { name: "Termos de uso e privacidade" })).toBeVisible();
});

test("credenciais inválidas mostram a mensagem da API", async () => {
  servidor.use(
    http.post("*/api/v1/auth/login", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "credenciais_invalidas",
            mensagem: "E-mail/usuário ou senha incorretos.",
            campos: {},
          },
        },
        { status: 401 },
      ),
    ),
  );
  const { evento } = renderizar(undefined, { rota: "/entrar" });

  await preencherEEnviar(evento);

  expect(await screen.findByRole("alert")).toHaveTextContent("E-mail/usuário ou senha incorretos.");
});

test("campos vazios são avisados sem chamar a API", async () => {
  const { evento } = renderizar(undefined, { rota: "/entrar" });

  await evento.click(screen.getByRole("button", { name: "Entrar" }));

  expect(await screen.findByText("Informe seu e-mail ou usuário.")).toBeVisible();
  expect(screen.getByText("Informe sua senha.")).toBeVisible();
});

test.each([
  "//site.com",
  "https://site.com",
  "configuracoes",
  null,
  "/\\site.com",
  "/\\/site.com",
  "\\\\site.com",
  "/\tsite.com",
  "/\t/site.com",
  "/\n/site.com",
])("destino inseguro %s vira a página inicial", (valor) => {
  expect(destinoSeguro(valor)).toBe("/");
});

test("destino interno é mantido, com busca e âncora", () => {
  expect(destinoSeguro("/u/ana")).toBe("/u/ana");
  expect(destinoSeguro("/buscar?q=adega#topo")).toBe("/buscar?q=adega#topo");
});
