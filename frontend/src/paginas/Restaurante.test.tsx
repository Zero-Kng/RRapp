import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import type { RestauranteDetalhe } from "../api/tipos";
import { aprazivelDetalhe, eu, pagina, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";
import { formatarData, mesDoAno } from "../util/datas";

const ROTA = "/r/aprazivel-santa-teresa";

function responder(detalhe: RestauranteDetalhe = aprazivelDetalhe, criticas = [registro()]) {
  servidor.use(
    http.get("*/api/v1/restaurantes/aprazivel-santa-teresa", () => HttpResponse.json(detalhe)),
    http.get("*/api/v1/restaurantes/aprazivel-santa-teresa/registros", () =>
      HttpResponse.json(pagina(criticas)),
    ),
  );
}

test("mostra dados, nota e histograma", async () => {
  responder();
  renderizar(undefined, { rota: ROTA });

  expect(await screen.findByRole("heading", { name: "Aprazível", level: 1 })).toBeVisible();
  expect(screen.getByText("Rua Aprazível, 62")).toBeVisible();
  expect(screen.getByRole("link", { name: /Ver no mapa/ })).toHaveAttribute(
    "href",
    aprazivelDetalhe.link_mapa,
  );
  expect(screen.getByText("4,5")).toBeVisible();
  expect(screen.getByText("12 avaliações")).toBeVisible();
  expect(screen.getByRole("img", { name: /Distribuição das notas/ })).toBeInTheDocument();
});

test("lista as críticas mais recentes", async () => {
  responder();
  renderizar(undefined, { rota: ROTA });

  expect(await screen.findByText("Vista linda.")).toBeVisible();
  expect(screen.getByRole("link", { name: /Ana/ })).toHaveAttribute("href", "/u/ana");
  expect(screen.getByLabelText("Curtiu")).toBeInTheDocument();
});

test("anônimo vê convite para entrar em vez do botão de registrar", async () => {
  responder();
  renderizar(undefined, { rota: ROTA });

  expect(
    await screen.findByRole("link", { name: "Entre para registrar sua visita" }),
  ).toHaveAttribute("href", `/entrar?voltar=${encodeURIComponent(ROTA)}`);
  expect(screen.queryByRole("button", { name: "Registrar visita" })).not.toBeInTheDocument();
});

test("logado vê o botão Registrar visita e a sua última visita", async () => {
  responder({
    ...aprazivelDetalhe,
    meu_ultimo_registro: { id: 9, data_visita: "2026-09-20", nota: 4, curtiu: false },
  });
  renderizar(undefined, { rota: ROTA, usuario: eu });

  expect(await screen.findByRole("button", { name: "Registrar visita" })).toBeVisible();
  expect(screen.getByText(/Sua última visita: 20 de set\. de 2026/)).toBeVisible();
});

test("restaurante inexistente mostra página não encontrada", async () => {
  servidor.use(
    http.get("*/api/v1/restaurantes/sumiu", () =>
      HttpResponse.json(
        { erro: { codigo: "nao_encontrado", mensagem: "Não encontrado.", campos: {} } },
        { status: 404 },
      ),
    ),
    http.get("*/api/v1/restaurantes/sumiu/registros", () =>
      HttpResponse.json(
        { erro: { codigo: "nao_encontrado", mensagem: "Não encontrado.", campos: {} } },
        { status: 404 },
      ),
    ),
  );
  renderizar(undefined, { rota: "/r/sumiu" });

  expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});

test("datas no formato brasileiro sem trocar de dia", () => {
  expect(formatarData("2026-09-20")).toBe("20 de set. de 2026");
  expect(mesDoAno("2026-09-20")).toBe("setembro de 2026");
});
