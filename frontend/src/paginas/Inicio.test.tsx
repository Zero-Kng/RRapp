import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import type { Registro } from "../api/tipos";
import { eu, pagina, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

function responderDiario(registros: Registro[]) {
  servidor.use(
    http.get("*/api/v1/usuarios/ana/diario", () => HttpResponse.json(pagina(registros))),
  );
}

test("buscar leva para a página de busca", async () => {
  let termoBuscado: string | null = null;
  servidor.use(
    http.get("*/api/v1/restaurantes", ({ request }) => {
      termoBuscado = new URL(request.url).searchParams.get("q");
      return HttpResponse.json(pagina([]));
    }),
    http.get("*/api/v1/bairros", () => HttpResponse.json([])),
    http.get("*/api/v1/categorias", () => HttpResponse.json([])),
  );
  const { evento } = renderizar();

  const campo = await screen.findByRole("searchbox", { name: "Buscar restaurante" });
  expect(campo).toHaveAttribute("placeholder", "Aprazível, Adega Pérola…");
  await evento.type(campo, "aprazível{Enter}");

  expect(await screen.findByRole("heading", { name: "Buscar", level: 1 })).toBeVisible();
  expect(screen.getByRole("searchbox", { name: "Buscar restaurante" })).toHaveValue("aprazível");
  await screen.findByText("Nenhum restaurante encontrado. Tente outro termo ou tire filtros.");
  expect(termoBuscado).toBe("aprazível");
});

test("logado vê as últimas 5 visitas", async () => {
  responderDiario(
    Array.from({ length: 7 }, (_, i) =>
      registro({ id: i + 1, data_visita: `2026-09-${String(20 - i).padStart(2, "0")}` }),
    ),
  );
  renderizar(undefined, { usuario: eu });

  const secao = await screen.findByRole("region", { name: "Suas últimas visitas" });
  expect(await within(secao).findAllByRole("article")).toHaveLength(5);
  expect(within(secao).getByRole("link", { name: "Ver diário completo" })).toHaveAttribute(
    "href",
    "/u/ana",
  );
});

test("logado sem visitas vê o convite", async () => {
  responderDiario([]);
  renderizar(undefined, { usuario: eu });

  expect(
    await screen.findByText(
      "Você ainda não registrou visitas. Busque um restaurante e registre a primeira.",
    ),
  ).toBeVisible();
});

test("anônimo vê a apresentação e o convite para criar conta", async () => {
  renderizar();

  expect(
    await screen.findByRole("heading", { name: "Onde você comeu hoje?", level: 1 }),
  ).toBeVisible();
  const principal = screen.getByRole("main");
  expect(within(principal).getByRole("link", { name: "Criar conta" })).toHaveAttribute(
    "href",
    "/cadastro",
  );
  expect(screen.queryByRole("region", { name: "Suas últimas visitas" })).not.toBeInTheDocument();
});
