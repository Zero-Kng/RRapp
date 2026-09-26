import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, test } from "vitest";
import type { Desejo } from "../api/tipos";
import { aprazivel, desejo, eu, pagina, perfilAna } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

const adega = { ...aprazivel, slug: "adega-perola", nome: "Adega Pérola", bairro: "Tijuca" };
const bar = { ...aprazivel, slug: "bar-sem-bairro", nome: "Bar Sem Bairro", bairro: "" };

let ordens: string[] = [];

function responder(desejos: Desejo[]) {
  servidor.use(
    http.get("*/api/v1/usuarios/ana", () => HttpResponse.json(perfilAna)),
    http.get("*/api/v1/usuarios/ana/diario", () => HttpResponse.json(pagina([]))),
    http.get("*/api/v1/usuarios/ana/desejos", ({ request }) => {
      ordens.push(new URL(request.url).searchParams.get("ordem") ?? "");
      return HttpResponse.json(pagina(desejos));
    }),
  );
}

beforeEach(() => {
  ordens = [];
});

async function abrirAba(usuario = eu) {
  const resultado = renderizar(undefined, { rota: "/u/ana", usuario });
  await resultado.evento.click(await screen.findByRole("tab", { name: "Desejos" }));
  return { ...resultado, painel: screen.getByRole("tabpanel") };
}

test("mostra os desejos mais recentes primeiro", async () => {
  responder([desejo({ restaurante: adega }), desejo()]);
  const { painel } = await abrirAba();

  const links = await within(painel).findAllByRole("link", { name: /Aprazível|Adega Pérola/ });
  expect(links.map((link) => link.textContent)).toEqual([
    expect.stringContaining("Adega Pérola"),
    expect.stringContaining("Aprazível"),
  ]);
  expect(ordens).toEqual(["recentes"]);
});

test("por bairro agrupa com um título por bairro e 'Sem bairro' no fim", async () => {
  responder([desejo(), desejo({ restaurante: adega }), desejo({ restaurante: bar })]);
  const { evento, painel } = await abrirAba();
  await within(painel).findByRole("link", { name: /Aprazível/ });

  await evento.selectOptions(within(painel).getByLabelText("Ordenar"), "bairro");

  expect(
    await within(painel).findByRole("heading", { level: 3, name: "Sem bairro" }),
  ).toBeVisible();
  const titulos = within(painel).getAllByRole("heading", { level: 3 });
  expect(titulos.map((titulo) => titulo.textContent)).toEqual([
    "Santa Teresa",
    "Tijuca",
    "Sem bairro",
  ]);
  expect(ordens.at(-1)).toBe("bairro");
});

test("vazio no próprio perfil ensina a guardar", async () => {
  responder([]);
  await abrirAba();

  expect(
    await screen.findByText(
      "Você ainda não guardou restaurantes. Toque em Desejo na página de um restaurante.",
    ),
  ).toBeVisible();
});

test("vazio no perfil de outra pessoa", async () => {
  responder([]);
  await abrirAba(null);

  expect(await screen.findByText("Nenhum desejo ainda.")).toBeVisible();
});
