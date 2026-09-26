import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, expect, test } from "vitest";
import { definirAcesso } from "../api/sessao";
import { aprazivelDetalhe, eu, pagina } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

const ROTA = "/r/aprazivel-santa-teresa";
const DESEJO = "*/api/v1/eu/desejos/aprazivel-santa-teresa";

let desejado = false;
let metodos: string[] = [];

beforeEach(() => {
  desejado = false;
  metodos = [];
  servidor.use(
    http.get("*/api/v1/restaurantes/aprazivel-santa-teresa", () =>
      HttpResponse.json({ ...aprazivelDetalhe, na_minha_lista_de_desejos: desejado }),
    ),
    http.get("*/api/v1/restaurantes/aprazivel-santa-teresa/registros", () =>
      HttpResponse.json(pagina([])),
    ),
    http.put(DESEJO, () => {
      metodos.push("PUT");
      desejado = true;
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(DESEJO, () => {
      metodos.push("DELETE");
      desejado = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

afterEach(() => definirAcesso(null));

test("logado guarda e tira o desejo", async () => {
  const { evento } = renderizar(undefined, { rota: ROTA, usuario: eu });

  const botao = await screen.findByRole("button", { name: "Desejo" });
  expect(botao).toHaveAttribute("aria-pressed", "false");

  await evento.click(botao);
  await waitFor(() => expect(botao).toHaveAttribute("aria-pressed", "true"));
  expect(metodos).toEqual(["PUT"]);

  await evento.click(botao);
  await waitFor(() => expect(botao).toHaveAttribute("aria-pressed", "false"));
  expect(metodos).toEqual(["PUT", "DELETE"]);
});

test("clique duplo faz uma requisição só", async () => {
  let liberar!: () => void;
  const segurar = new Promise<void>((resolver) => (liberar = resolver));
  servidor.use(
    http.put(DESEJO, async () => {
      metodos.push("PUT");
      await segurar;
      desejado = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderizar(undefined, { rota: ROTA, usuario: eu });
  const botao = await screen.findByRole("button", { name: "Desejo" });

  // Dois cliques no mesmo instante, antes de a tela mostrar o botão desabilitado
  fireEvent.click(botao);
  fireEvent.click(botao);

  await waitFor(() => expect(botao).toBeDisabled());
  liberar();
  await waitFor(() => expect(botao).toHaveAttribute("aria-pressed", "true"));
  expect(metodos).toEqual(["PUT"]);
});

test("anônimo é levado a entrar e volta ao restaurante", async () => {
  renderizar(undefined, { rota: ROTA });

  expect(await screen.findByRole("link", { name: "Desejo" })).toHaveAttribute(
    "href",
    "/entrar?voltar=%2Fr%2Faprazivel-santa-teresa",
  );
});

test("erro ao guardar aparece como aviso", async () => {
  servidor.use(http.put(DESEJO, () => new HttpResponse(null, { status: 500 })));
  const { evento } = renderizar(undefined, { rota: ROTA, usuario: eu });

  await evento.click(await screen.findByRole("button", { name: "Desejo" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Algo deu errado. Tente de novo.");
});
