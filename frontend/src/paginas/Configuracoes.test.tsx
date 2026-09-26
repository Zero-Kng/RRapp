import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, expect, test } from "vitest";
import { definirAcesso, tokenDeAcesso } from "../api/sessao";
import { cidadeRio, eu } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

let requisicoesPerfil: { tipo: string; corpo: unknown }[] = [];

beforeEach(() => {
  requisicoesPerfil = [];
  servidor.use(
    http.get("*/api/v1/cidades", () => HttpResponse.json([cidadeRio])),
    http.patch("*/api/v1/eu/perfil", async ({ request }) => {
      const tipo = request.headers.get("Content-Type") ?? "";
      // multipart vai como texto bruto: o formData() do Node não aceita o File do jsdom
      const corpo: unknown = tipo.includes("multipart")
        ? await request.text()
        : await request.json();
      requisicoesPerfil.push({ tipo, corpo });
      return HttpResponse.json({ ...eu, nome_exibicao: "Ana Maria", bio: "Carioca" });
    }),
  );
});

afterEach(() => definirAcesso(null));

function abrir() {
  return renderizar(undefined, { rota: "/configuracoes", usuario: eu });
}

test("salva nome, bio e cidade", async () => {
  const { evento } = abrir();
  const nome = await screen.findByLabelText("Nome de exibição");

  await evento.clear(nome);
  await evento.type(nome, "Ana Maria");
  await evento.type(screen.getByLabelText("Bio"), "Carioca");
  await evento.selectOptions(screen.getByLabelText("Cidade"), "rio-de-janeiro");
  await evento.click(screen.getByRole("button", { name: "Salvar perfil" }));

  expect(await screen.findByText("Perfil atualizado.")).toBeVisible();
  expect(requisicoesPerfil[0].tipo).toContain("application/json");
  expect(requisicoesPerfil[0].corpo).toEqual({
    nome_exibicao: "Ana Maria",
    bio: "Carioca",
    cidade: "rio-de-janeiro",
  });
});

test("envia o avatar como multipart", async () => {
  const { evento } = abrir();
  const arquivo = new File([new Uint8Array([137, 80, 78, 71])], "eu.png", { type: "image/png" });

  await evento.upload(await screen.findByLabelText("Foto de perfil"), arquivo);
  await evento.click(screen.getByRole("button", { name: "Salvar perfil" }));

  await screen.findByText("Perfil atualizado.");
  expect(requisicoesPerfil[0].tipo).toContain("multipart/form-data");
  // o nome do arquivo vira "blob" na ponte jsdom → fetch do Vitest; no navegador ele é mantido
  expect(requisicoesPerfil[0].corpo).toMatch(
    /name="avatar"; filename="[^"]+"\r\nContent-Type: image\/png/,
  );
});

test.each([
  ["grande", 2 * 1024 * 1024 + 1, "image/png", "A imagem deve ter no máximo 2 MB."],
  ["gif", 10, "image/gif", "Envie uma imagem JPG, PNG ou WebP."],
])("avatar %s é barrado antes de enviar", async (_nome, tamanho, tipo, mensagem) => {
  abrir();
  const arquivo = new File([new Uint8Array(tamanho)], "foto", { type: tipo });

  fireEvent.change(await screen.findByLabelText("Foto de perfil"), {
    target: { files: [arquivo] },
  });

  expect(await screen.findByText(mensagem)).toBeVisible();
  expect(screen.getByRole("button", { name: "Salvar perfil" })).toBeEnabled();
  expect(requisicoesPerfil).toHaveLength(0);
});

test("erro do servidor no avatar aparece no campo", async () => {
  servidor.use(
    http.patch("*/api/v1/eu/perfil", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "dados_invalidos",
            mensagem: "Dados inválidos.",
            campos: { avatar: ["A imagem é grande demais (dimensões)."] },
          },
        },
        { status: 400 },
      ),
    ),
  );
  const { evento } = abrir();

  await evento.upload(
    await screen.findByLabelText("Foto de perfil"),
    new File([new Uint8Array(10)], "eu.png", { type: "image/png" }),
  );
  await evento.click(screen.getByRole("button", { name: "Salvar perfil" }));

  expect(await screen.findByText("A imagem é grande demais (dimensões).")).toBeVisible();
});

test("trocar senha guarda o novo acesso", async () => {
  servidor.use(http.post("*/api/v1/eu/senha", () => HttpResponse.json({ acesso: "novo" })));
  const { evento } = abrir();

  await evento.type(await screen.findByLabelText("Senha atual"), "senha-forte-123");
  await evento.type(screen.getByLabelText("Nova senha"), "outra-senha-forte");
  await evento.click(screen.getByRole("button", { name: "Trocar senha" }));

  expect(await screen.findByText("Senha alterada.")).toBeVisible();
  expect(tokenDeAcesso()).toBe("novo");
});

test("senha atual errada mostra a mensagem da API", async () => {
  servidor.use(
    http.post("*/api/v1/eu/senha", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "senha_incorreta",
            mensagem: "A senha atual está incorreta.",
            campos: {},
          },
        },
        { status: 400 },
      ),
    ),
  );
  const { evento } = abrir();

  await evento.type(await screen.findByLabelText("Senha atual"), "errada");
  await evento.type(screen.getByLabelText("Nova senha"), "outra-senha-forte");
  await evento.click(screen.getByRole("button", { name: "Trocar senha" }));

  expect(await screen.findByText("A senha atual está incorreta.")).toBeVisible();
});

test("excluir conta pede a senha e desloga", async () => {
  let corpo: unknown;
  servidor.use(
    http.post("*/api/v1/eu/excluir", async ({ request }) => {
      corpo = await request.json();
      return new HttpResponse(null, { status: 204 });
    }),
    http.post("*/api/v1/auth/logout", () => new HttpResponse(null, { status: 204 })),
  );
  const { evento } = abrir();

  await evento.click(await screen.findByRole("button", { name: "Excluir conta" }));
  const dialogo = await screen.findByRole("dialog");
  await evento.type(within(dialogo).getByLabelText("Sua senha"), "senha-forte-123");
  await evento.click(within(dialogo).getByRole("button", { name: "Excluir definitivamente" }));

  expect(await screen.findByRole("link", { name: "Criar conta" })).toBeVisible();
  expect(corpo).toEqual({ senha: "senha-forte-123" });
});

test("o seletor de tema aparece na página", async () => {
  abrir();

  expect(await screen.findByRole("group", { name: "Tema" })).toBeVisible();
});
