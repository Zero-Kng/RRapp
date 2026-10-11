import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, test, vi } from "vitest";
import type { Registro } from "../api/tipos";
import { eu, pagina, paginaDoFeed, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

afterEach(() => vi.unstubAllGlobals());

const PROXIMA = "http://localhost:3000/api/v1/feed?cursor=abc";

function itens(quantidade: number, primeiroId = 1): Registro[] {
  return Array.from({ length: quantidade }, (_, i) => registro({ id: primeiroId + i }));
}

/** Feed com 20 itens e uma 2ª página com mais 1; guarda os cursores pedidos. */
function responderDuasPaginas({ falharSegundaUmaVez = false } = {}) {
  const cursores: (string | null)[] = [];
  let falhou = false;
  servidor.use(
    http.get("*/api/v1/feed", ({ request }) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      cursores.push(cursor);
      if (!cursor) return HttpResponse.json(paginaDoFeed(itens(20), PROXIMA));
      if (falharSegundaUmaVez && !falhou) {
        falhou = true;
        return HttpResponse.json(
          { erro: { codigo: "erro", mensagem: "Falhou.", campos: {} } },
          { status: 500 },
        );
      }
      return HttpResponse.json(paginaDoFeed(itens(1, 21)));
    }),
  );
  return cursores;
}

async function feed() {
  return screen.findByRole("region", { name: "Visitas da comunidade" });
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

test("logado vê o feed da comunidade, sem 'Suas últimas visitas'", async () => {
  servidor.use(http.get("*/api/v1/feed", () => HttpResponse.json(paginaDoFeed(itens(2)))));
  renderizar(undefined, { usuario: eu });

  expect(await within(await feed()).findAllByRole("article")).toHaveLength(2);
  expect(screen.queryByRole("region", { name: "Suas últimas visitas" })).not.toBeInTheDocument();
});

test("anônimo vê a apresentação e, abaixo, o mesmo feed", async () => {
  servidor.use(http.get("*/api/v1/feed", () => HttpResponse.json(paginaDoFeed(itens(2)))));
  renderizar();

  expect(
    await screen.findByRole("heading", { name: "Onde você comeu hoje?", level: 1 }),
  ).toBeVisible();
  const principal = screen.getByRole("main");
  expect(within(principal).getByRole("link", { name: "Criar conta" })).toHaveAttribute(
    "href",
    "/cadastro",
  );
  expect(await within(await feed()).findAllByRole("article")).toHaveLength(2);
});

test("'Carregar mais' busca a próxima página pelo cursor", async () => {
  const cursores = responderDuasPaginas();
  const { evento } = renderizar();
  const secao = await feed();
  expect(await within(secao).findAllByRole("article")).toHaveLength(20);

  await evento.click(within(secao).getByRole("button", { name: "Carregar mais" }));

  await waitFor(() => expect(within(secao).getAllByRole("article")).toHaveLength(21));
  expect(cursores).toEqual([null, "abc"]);
  expect(within(secao).queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
});

test("erro na próxima página mantém os itens e deixa tentar de novo", async () => {
  responderDuasPaginas({ falharSegundaUmaVez: true });
  const { evento } = renderizar();
  const secao = await feed();
  await within(secao).findAllByRole("article");

  await evento.click(within(secao).getByRole("button", { name: "Carregar mais" }));

  expect(await within(secao).findByText("Falhou.")).toBeVisible();
  expect(within(secao).getAllByRole("article")).toHaveLength(20);

  await evento.click(within(secao).getByRole("button", { name: "Carregar mais" }));

  await waitFor(() => expect(within(secao).getAllByRole("article")).toHaveLength(21));
  expect(within(secao).queryByText("Falhou.")).not.toBeInTheDocument();
});

test("feed vazio mostra o convite", async () => {
  renderizar();

  expect(
    await within(await feed()).findByText(
      "Ainda não há visitas com foto ou crítica. Registre a sua e ela aparece aqui.",
    ),
  ).toBeVisible();
});

test("erro ao carregar o feed mostra o aviso", async () => {
  servidor.use(
    http.get("*/api/v1/feed", () =>
      HttpResponse.json(
        { erro: { codigo: "erro", mensagem: "Fora do ar.", campos: {} } },
        { status: 500 },
      ),
    ),
  );
  renderizar();

  expect(await within(await feed()).findByText("Fora do ar.")).toBeVisible();
});

test("chegar perto do fim carrega a próxima página", async () => {
  let avisar: IntersectionObserverCallback = () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        avisar = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  const cursores = responderDuasPaginas();
  renderizar();
  const secao = await feed();
  await within(secao).findAllByRole("article");

  avisar([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

  await waitFor(() => expect(within(secao).getAllByRole("article")).toHaveLength(21));
  expect(cursores).toEqual([null, "abc"]);
});

test("chegar ao fim durante a atualização do feed não descarta a atualização", async () => {
  let avisar: IntersectionObserverCallback = () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        avisar = callback;
      }
      observe() {}
      disconnect() {
        avisar = () => {};
      }
    },
  );
  let liberar: () => void = () => {};
  const atualizacaoLiberada = new Promise<void>((resolver) => (liberar = resolver));
  let primeirasPaginas = 0;
  servidor.use(
    http.get("*/api/v1/feed", async ({ request }) => {
      if (new URL(request.url).searchParams.get("cursor")) {
        return HttpResponse.json(paginaDoFeed(itens(1, 21)));
      }
      primeirasPaginas += 1;
      if (primeirasPaginas === 1) return HttpResponse.json(paginaDoFeed(itens(20), PROXIMA));
      await atualizacaoLiberada; // a atualização demora a chegar
      const nova = registro({ id: 99, fotos: [], critica: "Acabou de chegar" });
      return HttpResponse.json(paginaDoFeed([nova, ...itens(19)], PROXIMA));
    }),
  );
  const { clienteConsultas } = renderizar();
  const secao = await feed();
  await within(secao).findAllByRole("article");

  void clienteConsultas.invalidateQueries({ queryKey: ["feed"] }); // ex.: apagou uma foto
  await waitFor(() => expect(primeirasPaginas).toBe(2));
  await waitFor(() =>
    expect(within(secao).getByRole("button", { name: "Carregar mais" })).toBeDisabled(),
  );
  avisar([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  liberar();

  expect(await within(secao).findByText("“Acabou de chegar”")).toBeVisible();
});
