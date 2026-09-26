import { fireEvent, screen } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { useState } from "react";
import { beforeEach, expect, test } from "vitest";
import { aprazivelDetalhe, eu, pagina, registro } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";
import { hojeLocal } from "../util/datas";
import { RegistrarVisita } from "./RegistrarVisita";

const restaurante = { slug: "aprazivel-santa-teresa", nome: "Aprazível" };

let corpos: unknown[] = [];

beforeEach(() => {
  corpos = [];
});

function aceitarRegistro({ atraso = 0 } = {}) {
  servidor.use(
    http.post("*/api/v1/registros", async ({ request }) => {
      corpos.push(await request.json());
      await delay(atraso);
      return HttpResponse.json(registro(), { status: 201 });
    }),
  );
}

function Pagina() {
  const [aberto, setAberto] = useState(true);
  return (
    <>
      <p>{aberto ? "aberto" : "fechado"}</p>
      <RegistrarVisita restaurante={restaurante} aberto={aberto} aoMudarAberto={setAberto} />
    </>
  );
}

function abrir() {
  return renderizar(<Pagina />, { usuario: eu });
}

test("salva data, nota, crítica e curtida", async () => {
  aceitarRegistro();
  const { evento } = abrir();

  screen.getByRole("slider", { name: "Nota" }).focus();
  await evento.keyboard("{ArrowRight>7/}");
  await evento.type(screen.getByLabelText("Crítica"), "Vista linda.");
  await evento.click(screen.getByLabelText("Curti"));
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("fechado")).toBeInTheDocument();
  expect(corpos).toEqual([
    {
      restaurante_slug: "aprazivel-santa-teresa",
      data_visita: hojeLocal(),
      nota: 3.5,
      critica: "Vista linda.",
      curtiu: true,
      revisita: false,
    },
  ]);
});

test("salva só a visita, sem nota nem crítica", async () => {
  aceitarRegistro();
  const { evento } = abrir();

  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  await screen.findByText("fechado");
  expect(corpos[0]).toMatchObject({ nota: null, critica: "" });
});

test("clique duplo cria um único registro", async () => {
  aceitarRegistro({ atraso: 100 });
  abrir();
  const salvar = screen.getByRole("button", { name: "Salvar" });

  // Dois cliques no mesmo instante, antes de a tela mostrar o botão desabilitado
  fireEvent.click(salvar);
  fireEvent.click(salvar);

  expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();
  await screen.findByText("fechado");
  expect(corpos).toHaveLength(1);
});

test("erro de data vindo do servidor aparece no campo", async () => {
  servidor.use(
    http.post("*/api/v1/registros", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "dados_invalidos",
            mensagem: "Dados inválidos.",
            campos: { data_visita: ["A data da visita não pode estar no futuro."] },
          },
        },
        { status: 400 },
      ),
    ),
  );
  const { evento } = abrir();

  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByLabelText("Data da visita")).toHaveAccessibleDescription(
    "A data da visita não pode estar no futuro.",
  );
  expect(screen.getByText("aberto")).toBeInTheDocument();
});

test("data no futuro é barrada antes de enviar", async () => {
  aceitarRegistro();
  const { evento } = abrir();
  const campo = screen.getByLabelText("Data da visita");

  await evento.clear(campo);
  await evento.type(campo, "2999-01-01");
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("A data não pode estar no futuro.")).toBeVisible();
  expect(corpos).toHaveLength(0);
});

test("crítica tem contador e limite de 5.000 caracteres", async () => {
  const { evento } = abrir();
  const critica = screen.getByLabelText("Crítica");

  await evento.click(critica);
  await evento.paste("x".repeat(5001));
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(screen.getByText("5001/5000")).toBeVisible();
  expect(await screen.findByText("A crítica pode ter até 5.000 caracteres.")).toBeVisible();
  expect(corpos).toHaveLength(0);
});

test("salvar atualiza a página do restaurante", async () => {
  let detalhesPedidos = 0;
  aceitarRegistro();
  servidor.use(
    http.get("*/api/v1/restaurantes/aprazivel-santa-teresa", () => {
      detalhesPedidos += 1;
      return HttpResponse.json(aprazivelDetalhe);
    }),
    http.get("*/api/v1/restaurantes/aprazivel-santa-teresa/registros", () =>
      HttpResponse.json(pagina([])),
    ),
  );
  const { evento } = renderizar(undefined, {
    rota: "/r/aprazivel-santa-teresa",
    usuario: eu,
  });

  await evento.click(await screen.findByRole("button", { name: "Registrar visita" }));
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  await screen.findByRole("button", { name: "Registrar visita" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await expect.poll(() => detalhesPedidos).toBe(2);
});
