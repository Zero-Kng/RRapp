import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, test } from "vitest";
import type { RestauranteResumo } from "../api/tipos";
import { aprazivel, pagina } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

let consultas: URLSearchParams[] = [];

function responderCom(resultados: RestauranteResumo[], extras = {}) {
  servidor.use(
    http.get("*/api/v1/restaurantes", ({ request }) => {
      consultas.push(new URL(request.url).searchParams);
      return HttpResponse.json(pagina(resultados, extras));
    }),
  );
}

beforeEach(() => {
  consultas = [];
  servidor.use(
    http.get("*/api/v1/bairros", () => HttpResponse.json(["Botafogo", "Santa Teresa"])),
    http.get("*/api/v1/categorias", () =>
      HttpResponse.json([{ slug: "brasileira", nome: "Brasileira" }]),
    ),
  );
});

const ultima = () => consultas.at(-1)!;

test("mostra os resultados da busca da URL", async () => {
  responderCom([aprazivel]);
  renderizar(undefined, { rota: "/buscar?q=aprazivel" });

  const link = await screen.findByRole("link", { name: /Aprazível/ });
  expect(link).toHaveAttribute("href", "/r/aprazivel-santa-teresa");
  expect(within(link).getByText("4,5")).toBeVisible();
  expect(screen.getByText("1 restaurante")).toBeVisible();
  expect(ultima().get("q")).toBe("aprazivel");
  expect(ultima().get("cidade")).toBe("rio-de-janeiro");
});

test("enviar o termo atualiza a busca e volta para a página 1", async () => {
  responderCom([aprazivel]);
  const { evento } = renderizar(undefined, { rota: "/buscar?q=x&page=3" });
  await screen.findByText("1 restaurante");

  const campo = screen.getByRole("searchbox", { name: "Buscar restaurante" });
  await evento.clear(campo);
  await evento.type(campo, "adega{Enter}");

  await screen.findByText("1 restaurante");
  expect(ultima().get("q")).toBe("adega");
  expect(ultima().get("page")).toBeNull();
});

test("filtros viram parâmetros da consulta", async () => {
  responderCom([aprazivel]);
  const { evento } = renderizar(undefined, { rota: "/buscar" });
  await screen.findByText("1 restaurante");

  await evento.selectOptions(await screen.findByLabelText("Bairro"), "Botafogo");
  await evento.selectOptions(screen.getByLabelText("Nota mínima"), "4");

  await screen.findByText("1 restaurante");
  expect(ultima().get("bairro")).toBe("Botafogo");
  expect(ultima().get("nota_min")).toBe("4");
});

test("sem resultados mostra orientação", async () => {
  responderCom([]);
  renderizar(undefined, { rota: "/buscar?q=zzz" });

  expect(
    await screen.findByText("Nenhum restaurante encontrado. Tente outro termo ou tire filtros."),
  ).toBeVisible();
});

test("paginação pede a próxima página", async () => {
  responderCom([aprazivel], { count: 40, next: "http://x/?page=2" });
  const { evento } = renderizar(undefined, { rota: "/buscar" });

  await evento.click(await screen.findByRole("button", { name: "Próxima" }));

  await screen.findByText("Página 2");
  expect(ultima().get("page")).toBe("2");
});

test("restaurante fechado e sem avaliações aparecem assim no cartão", async () => {
  responderCom([{ ...aprazivel, status: "fechado", nota_media: null, total_avaliacoes: 0 }]);
  renderizar(undefined, { rota: "/buscar" });

  const link = await screen.findByRole("link", { name: /Aprazível/ });
  expect(within(link).getByText("Fechado")).toBeVisible();
  expect(within(link).getByText("Sem avaliações")).toBeVisible();
});
