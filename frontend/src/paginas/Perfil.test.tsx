import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import type { Registro } from "../api/tipos";
import { aprazivel, eu, pagina, perfilAna, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

const adegaPerola = { ...aprazivel, slug: "adega-perola", nome: "Adega Pérola" };

function responder({ diario = [] as Registro[], criticas = [] as Registro[] } = {}) {
  servidor.use(
    http.get("*/api/v1/usuarios/ana", () => HttpResponse.json(perfilAna)),
    http.get("*/api/v1/usuarios/ana/diario", () => HttpResponse.json(pagina(diario))),
    http.get("*/api/v1/usuarios/ana/criticas", () => HttpResponse.json(pagina(criticas))),
  );
}

test("mostra o cabeçalho do perfil", async () => {
  responder();
  renderizar(undefined, { rota: "/u/ana" });

  expect(await screen.findByRole("heading", { name: "Ana", level: 1 })).toBeVisible();
  expect(screen.getByText("@ana")).toBeVisible();
  expect(screen.getByText("Amo boteco")).toBeVisible();
  expect(screen.getByText("Rio de Janeiro")).toBeVisible();
  expect(screen.getByText("restaurantes visitados")).toBeVisible();
  expect(screen.getByText("este ano")).toBeVisible();
});

test("diário agrupa as visitas por mês", async () => {
  responder({
    diario: [
      registro({ id: 1, data_visita: "2026-09-20" }),
      registro({ id: 2, data_visita: "2026-08-02", restaurante: adegaPerola }),
    ],
  });
  renderizar(undefined, { rota: "/u/ana" });

  const setembro = await screen.findByRole("region", { name: "setembro de 2026" });
  expect(within(setembro).getByRole("link", { name: "Aprazível" })).toBeVisible();
  const agosto = screen.getByRole("region", { name: "agosto de 2026" });
  expect(within(agosto).getByRole("link", { name: "Adega Pérola" })).toBeVisible();
});

test("aba Críticas lista só as críticas", async () => {
  responder({ criticas: [registro({ critica: "Bolinho excelente." })] });
  const { evento } = renderizar(undefined, { rota: "/u/ana" });

  await evento.click(await screen.findByRole("tab", { name: "Críticas" }));

  expect(await screen.findByText("Bolinho excelente.")).toBeVisible();
});

test("diário vazio convida o próprio usuário a registrar", async () => {
  responder();
  renderizar(undefined, { rota: "/u/ana", usuario: eu });

  expect(
    await screen.findByText(
      "Você ainda não registrou visitas. Busque um restaurante e registre a primeira.",
    ),
  ).toBeVisible();
});

test("diário vazio de outra pessoa", async () => {
  responder();
  renderizar(undefined, { rota: "/u/ana" });

  expect(await screen.findByText("Nenhuma visita registrada ainda.")).toBeVisible();
});

test("usuário inexistente mostra página não encontrada", async () => {
  const naoEncontrado = HttpResponse.json(
    { erro: { codigo: "nao_encontrado", mensagem: "Não encontrado.", campos: {} } },
    { status: 404 },
  );
  servidor.use(
    http.get("*/api/v1/usuarios/ninguem", () => naoEncontrado.clone()),
    http.get("*/api/v1/usuarios/ninguem/diario", () => naoEncontrado.clone()),
  );
  renderizar(undefined, { rota: "/u/ninguem" });

  expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});
