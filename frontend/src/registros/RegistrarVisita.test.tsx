import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
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

function aceitarRegistro({ esperar = Promise.resolve() } = {}) {
  servidor.use(
    http.post("*/api/v1/registros", async ({ request }) => {
      corpos.push(await request.json());
      await esperar;
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

test("salvar a visita manda recarregar os desejos", async () => {
  aceitarRegistro();
  const { evento, clienteConsultas } = abrir();
  const chave = ["desejos", "ana", "recentes", 1];
  clienteConsultas.setQueryData(chave, pagina([]));

  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("fechado")).toBeInTheDocument();
  expect(clienteConsultas.getQueryState(chave)?.isInvalidated).toBe(true);
});

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
  let liberarResposta!: () => void;
  aceitarRegistro({ esperar: new Promise<void>((liberar) => (liberarResposta = liberar)) });
  abrir();
  const salvar = screen.getByRole("button", { name: "Salvar" });

  // Dois cliques no mesmo instante, antes de a tela mostrar o botão desabilitado
  fireEvent.click(salvar);
  fireEvent.click(salvar);

  expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();
  liberarResposta();
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

// ---------- Fotos ----------

// A ponte jsdom → fetch do Vitest leva o tipo de cada parte, mas não os bytes do arquivo:
// cada foto de teste tem um tipo próprio, e é por ele que o servidor falso sabe qual chegou
const TIPOS: Record<string, string> = {
  "FOTO-1": "image/png",
  "FOTO-2": "image/jpeg",
  "FOTO-3": "image/webp",
  "FOTO-4": "image/heic",
  "FOTO-5": "image/heif",
};
const fotoPng = (marca: string) => new File([marca], `${marca}.img`, { type: TIPOS[marca] });
const marcaDoCorpo = (corpo: string) =>
  Object.entries(TIPOS).find(([, tipo]) => corpo.includes(`Content-Type: ${tipo}`))?.[0] ?? "?";

function aceitarFotos({ falharNas = [] as number[], esperar = Promise.resolve() } = {}) {
  const recebidas: string[] = [];
  let chamadas = 0;
  servidor.use(
    http.post("*/api/v1/registros/1/fotos", async ({ request }) => {
      chamadas += 1;
      // O corpo multipart vem como texto: o formData() do Node não aceita o File do jsdom
      const corpo = await request.text();
      await esperar;
      if (falharNas.includes(chamadas)) return new HttpResponse(null, { status: 500 });
      recebidas.push(marcaDoCorpo(corpo));
      return HttpResponse.json(
        {
          id: chamadas,
          imagem: "http://x/g.webp",
          miniatura: "http://x/m.webp",
          largura: 10,
          altura: 10,
        },
        { status: 201 },
      );
    }),
  );
  return { recebidas, chamadas: () => chamadas };
}

test("salva a visita e envia as fotos uma por vez, com progresso", async () => {
  aceitarRegistro();
  let liberar!: () => void;
  const fotos = aceitarFotos({ esperar: new Promise<void>((resolver) => (liberar = resolver)) });
  const { evento } = abrir();

  await evento.upload(screen.getByLabelText("Fotos (até 4)"), [
    fotoPng("FOTO-1"),
    fotoPng("FOTO-2"),
  ]);
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("Enviando fotos… 1 de 2")).toBeVisible();
  liberar();
  expect(await screen.findByText("fechado")).toBeInTheDocument();
  expect(fotos.recebidas).toEqual(["FOTO-1", "FOTO-2"]);
  expect(corpos).toHaveLength(1);
});

test("não deixa escolher mais de 4 fotos", async () => {
  const { evento } = abrir();

  await evento.upload(
    screen.getByLabelText("Fotos (até 4)"),
    [1, 2, 3, 4, 5].map((n) => fotoPng(`FOTO-${n}`)),
  );

  expect(screen.getByText("Cada visita pode ter até 4 fotos.")).toBeVisible();
  expect(screen.getAllByRole("button", { name: /^Tirar foto/ })).toHaveLength(4);
});

test("tirar uma foto antes de salvar", async () => {
  aceitarRegistro();
  const fotos = aceitarFotos();
  const { evento } = abrir();

  await evento.upload(screen.getByLabelText("Fotos (até 4)"), [
    fotoPng("FOTO-1"),
    fotoPng("FOTO-2"),
  ]);
  await evento.click(screen.getByRole("button", { name: "Tirar foto 1" }));
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("fechado")).toBeInTheDocument();
  expect(fotos.recebidas).toEqual(["FOTO-2"]);
});

test("falha no meio: registro fica salvo e só a foto que falhou é reenviada", async () => {
  aceitarRegistro();
  const fotos = aceitarFotos({ falharNas: [2] });
  const { evento } = abrir();

  await evento.upload(screen.getByLabelText("Fotos (até 4)"), [
    fotoPng("FOTO-1"),
    fotoPng("FOTO-2"),
    fotoPng("FOTO-3"),
  ]);
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("Não foi possível enviar 1 foto.")).toBeVisible();
  expect(fotos.recebidas).toEqual(["FOTO-1", "FOTO-3"]);
  await evento.click(screen.getByRole("button", { name: "Tentar de novo" }));

  expect(await screen.findByText("fechado")).toBeInTheDocument();
  expect(fotos.recebidas).toEqual(["FOTO-1", "FOTO-3", "FOTO-2"]);
  expect(fotos.chamadas()).toBe(4);
  expect(corpos).toHaveLength(1);
});

test("fechar depois de uma falha mantém o registro", async () => {
  aceitarRegistro();
  aceitarFotos({ falharNas: [1] });
  const { evento, clienteConsultas } = abrir();
  const chave = ["diario", "ana", 1];
  clienteConsultas.setQueryData(chave, pagina([]));

  await evento.upload(screen.getByLabelText("Fotos (até 4)"), [fotoPng("FOTO-1")]);
  await evento.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByText("Não foi possível enviar 1 foto.");
  await evento.click(screen.getByRole("button", { name: "Fechar" }));

  expect(await screen.findByText("fechado")).toBeInTheDocument();
  expect(clienteConsultas.getQueryState(chave)?.isInvalidated).toBe(true);
  expect(corpos).toHaveLength(1);
});

test("HEIC sem tipo (Windows) pode ser escolhido no campo", async () => {
  const { evento } = abrir();

  // O upload do user-event respeita o "accept" do campo, como a janela de arquivos do sistema
  await evento.upload(
    screen.getByLabelText("Fotos (até 4)"),
    new File(["x"], "IMG_1.HEIC", { type: "" }),
  );

  expect(screen.getByRole("button", { name: "Tirar foto 1" })).toBeVisible();
});

test("foto recusada pelo servidor mostra o motivo e não oferece tentar de novo", async () => {
  aceitarRegistro();
  servidor.use(
    http.post("*/api/v1/registros/1/fotos", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "dados_invalidos",
            mensagem: "Dados inválidos.",
            campos: { imagem: ["A imagem é grande demais (dimensões)."] },
          },
        },
        { status: 400 },
      ),
    ),
  );
  const { evento } = abrir();

  await evento.upload(screen.getByLabelText("Fotos (até 4)"), [fotoPng("FOTO-1")]);
  await evento.click(screen.getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("A imagem é grande demais (dimensões).")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Fechar" })).toBeVisible();
});
