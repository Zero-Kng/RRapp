import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, expect, test } from "vitest";
import { definirAcesso } from "../api/sessao";
import type { Eu, Registro } from "../api/tipos";
import { eu, foto, pagina, perfilAna, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

let apagadas: string[] = [];
let buscasDoDiario = 0;

function responder(registros: Registro[]) {
  servidor.use(
    http.get("*/api/v1/usuarios/ana", () => HttpResponse.json(perfilAna)),
    http.get("*/api/v1/usuarios/ana/diario", () => {
      buscasDoDiario += 1;
      return HttpResponse.json(pagina(registros));
    }),
    http.delete("*/api/v1/registros/:id/fotos/:foto", ({ params }) => {
      apagadas.push(`${params.id}/${params.foto}`);
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

beforeEach(() => {
  apagadas = [];
  buscasDoDiario = 0;
});

afterEach(() => definirAcesso(null));

const comDuasFotos = registro({ id: 7, fotos: [foto({ id: 1 }), foto({ id: 2 })] });

function abrir(usuario: Eu | null = null) {
  return renderizar(undefined, { rota: "/u/ana", usuario });
}

test("mostra as miniaturas das fotos do registro", async () => {
  responder([comDuasFotos, registro({ id: 8 })]);
  abrir();

  const primeira = await screen.findByRole("button", { name: "Ver foto 1 de 2" });
  expect(screen.getByRole("button", { name: "Ver foto 2 de 2" })).toBeVisible();
  expect(primeira.querySelector("img")).toHaveAttribute(
    "src",
    "http://localhost:3000/media/fotos/mini-1.webp",
  );
});

test("tocar numa miniatura abre a tela cheia na foto certa e navega", async () => {
  responder([comDuasFotos]);
  const { evento } = abrir();

  await evento.click(await screen.findByRole("button", { name: "Ver foto 2 de 2" }));

  const telaCheia = await screen.findByRole("dialog");
  expect(within(telaCheia).getByRole("img")).toHaveAttribute(
    "src",
    "http://localhost:3000/media/fotos/grande-2.webp",
  );
  expect(within(telaCheia).getByText("2 / 2")).toBeVisible();

  await evento.click(within(telaCheia).getByRole("button", { name: "Foto anterior" }));
  expect(within(telaCheia).getByRole("img")).toHaveAttribute(
    "src",
    "http://localhost:3000/media/fotos/grande-1.webp",
  );
  expect(within(telaCheia).getByText("1 / 2")).toBeVisible();
});

test("o dono apaga a foto com confirmação", async () => {
  responder([comDuasFotos]);
  const { evento } = abrir(eu);

  await evento.click(await screen.findByRole("button", { name: "Ver foto 2 de 2" }));
  await evento.click(await screen.findByRole("button", { name: "Apagar esta foto" }));
  await evento.click(await screen.findByRole("button", { name: "Apagar" }));

  await waitFor(() => expect(apagadas).toEqual(["7/2"]));
  await waitFor(() => expect(buscasDoDiario).toBeGreaterThan(1));
});

test("no registro de outra pessoa não há como apagar", async () => {
  responder([comDuasFotos]);
  const { evento } = abrir({ ...eu, username: "bia" });

  await evento.click(await screen.findByRole("button", { name: "Ver foto 1 de 2" }));

  await screen.findByRole("dialog");
  expect(screen.queryByRole("button", { name: "Apagar esta foto" })).not.toBeInTheDocument();
});
