import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { Registro } from "../api/tipos";
import { foto, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { tempoDesde } from "../util/datas";
import { ItemDoFeed } from "./ItemDoFeed";

afterEach(() => vi.restoreAllMocks());

function mostrar(item: Registro) {
  return renderizar(<ItemDoFeed item={item} />);
}

/** Faz todo texto parecer maior que o espaço dele (o jsdom não calcula layout). */
function textoTransborda(transborda: boolean) {
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(transborda ? 200 : 60);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(60);
}

test("item com foto: pôster com restaurante, estrelas, bairro e curtida", () => {
  mostrar(registro({ fotos: [foto()] }));

  const artigo = screen.getByRole("article");
  expect(within(artigo).getByRole("link", { name: "Aprazível" })).toHaveAttribute(
    "href",
    "/r/aprazivel-santa-teresa",
  );
  expect(within(artigo).getByRole("img", { name: "3,5 de 5 estrelas" })).toBeVisible();
  expect(within(artigo).getByText("Santa Teresa")).toBeVisible();
  expect(within(artigo).getByRole("img", { name: "Curtiu" })).toBeVisible();
  expect(within(artigo).getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/u/ana");
  expect(within(artigo).getByText("Vista linda.")).toBeVisible();
  expect(within(artigo).queryByText("1/1")).not.toBeInTheDocument();
});

test("várias fotos: contador e deslizar", () => {
  mostrar(registro({ fotos: [foto({ id: 1 }), foto({ id: 2 }), foto({ id: 3 })] }));

  expect(screen.getByText("1/3")).toBeVisible();
  const trilho = screen.getByRole("button", { name: "Ver foto 1 de 3" }).parentElement!;
  Object.defineProperty(trilho, "clientWidth", { configurable: true, value: 300 });
  trilho.scrollLeft = 300;
  fireEvent.scroll(trilho);

  expect(screen.getByText("2/3")).toBeVisible();
});

test("tocar na foto abre a tela cheia naquela foto", async () => {
  const { evento } = mostrar(
    registro({ fotos: [foto({ id: 1 }), foto({ id: 2 }), foto({ id: 3 })] }),
  );

  await evento.click(screen.getByRole("button", { name: "Ver foto 2 de 3" }));

  const telaCheia = await screen.findByRole("dialog");
  expect(within(telaCheia).getByRole("img", { name: "Foto 2 de 3 de Aprazível" })).toBeVisible();
});

test("proporção do pôster vem da 1ª foto, limitada a 4:5", () => {
  mostrar(registro({ fotos: [foto({ largura: 900, altura: 1600 })] }));

  const fotos = screen.getByRole("region", { name: "Fotos da visita" });
  expect(fotos.style.aspectRatio).toMatch(/^0\.8\b/);
});

test("sem foto: a crítica vira o pôster azul", () => {
  mostrar(registro({ fotos: [], critica: "Os petiscos valem a visita." }));

  const artigo = screen.getByRole("article");
  expect(within(artigo).getByText("“Os petiscos valem a visita.”")).toBeVisible();
  expect(within(artigo).getByRole("link", { name: "Aprazível" })).toBeVisible();
  expect(within(artigo).getByRole("img", { name: "3,5 de 5 estrelas" })).toBeVisible();
  expect(screen.queryByRole("region", { name: "Fotos da visita" })).not.toBeInTheDocument();
});

test("crítica longa mostra 'ver mais' e abre o texto todo", async () => {
  textoTransborda(true);
  const { evento } = mostrar(registro({ fotos: [foto()], critica: "Texto comprido." }));

  const verMais = screen.getByRole("button", { name: "ver mais" });
  expect(verMais).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("Texto comprido.")).toHaveClass("line-clamp-3");

  await evento.click(verMais);

  expect(screen.queryByRole("button", { name: "ver mais" })).not.toBeInTheDocument();
  expect(screen.getByText("Texto comprido.")).not.toHaveClass("line-clamp-3");
});

test("crítica curta não mostra 'ver mais'", () => {
  textoTransborda(false);
  mostrar(registro({ fotos: [foto()], critica: "Curta." }));

  expect(screen.queryByRole("button", { name: "ver mais" })).not.toBeInTheDocument();
});

test("hora da postagem no topo", () => {
  const item = registro({ fotos: [foto()] });
  mostrar(item);

  const hora = screen.getByText(tempoDesde(item.criado_em));
  expect(hora.tagName).toBe("TIME");
  expect(hora).toHaveAttribute("dateTime", item.criado_em);
});

test("só os itens do topo baixam a 1ª foto na hora; os outros esperam a rolagem", () => {
  const item = registro({ fotos: [foto({ id: 1 }), foto({ id: 2 })] });
  const atrasos = (elemento: HTMLElement) =>
    Array.from(elemento.querySelectorAll("img"), (img) => img.getAttribute("loading"));

  const comum = renderizar(<ItemDoFeed item={item} />);
  expect(atrasos(comum.container)).toEqual(["lazy", "lazy"]);
  comum.unmount();

  const prioritario = renderizar(<ItemDoFeed item={item} prioritaria />);
  expect(atrasos(prioritario.container)).toEqual([null, "lazy"]);
});
