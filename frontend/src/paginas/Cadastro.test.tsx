import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, test } from "vitest";
import { definirAcesso } from "../api/sessao";
import { eu, pagina } from "../testes/dados";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

afterEach(() => definirAcesso(null));

async function preencher(evento: ReturnType<typeof renderizar>["evento"], aceitar = true) {
  await evento.type(screen.getByLabelText("Nome de usuário"), "ana");
  await evento.type(screen.getByLabelText("E-mail"), "ana@example.com");
  await evento.type(screen.getByLabelText("Senha"), "uma-senha-bem-forte");
  if (aceitar) {
    await evento.click(
      screen.getByLabelText("Li e aceito os termos de uso e a política de privacidade"),
    );
  }
  await evento.click(screen.getByRole("button", { name: "Criar conta" }));
}

test("cria a conta e entra", async () => {
  let corpo: unknown;
  servidor.use(
    http.post("*/api/v1/auth/cadastro", async ({ request }) => {
      corpo = await request.json();
      return HttpResponse.json({ usuario: eu, acesso: "t" }, { status: 201 });
    }),
    http.get("*/api/v1/usuarios/ana/diario", () => HttpResponse.json(pagina([]))),
  );
  const { evento } = renderizar(undefined, { rota: "/cadastro" });

  await preencher(evento);

  expect(await screen.findByRole("heading", { name: "Onde você comeu hoje?" })).toBeVisible();
  expect(corpo).toEqual({
    username: "ana",
    email: "ana@example.com",
    senha: "uma-senha-bem-forte",
    aceite_termos: true,
  });
});

test("sem aceitar os termos não envia", async () => {
  const { evento } = renderizar(undefined, { rota: "/cadastro" });

  await preencher(evento, false);

  expect(await screen.findByText("Aceite os termos para continuar.")).toBeVisible();
});

test("erro do servidor aparece no campo certo", async () => {
  servidor.use(
    http.post("*/api/v1/auth/cadastro", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "dados_invalidos",
            mensagem: "Dados inválidos.",
            campos: { username: ["Este nome de usuário já está em uso."] },
          },
        },
        { status: 400 },
      ),
    ),
  );
  const { evento } = renderizar(undefined, { rota: "/cadastro" });

  await preencher(evento);

  expect(await screen.findByLabelText("Nome de usuário")).toHaveAccessibleDescription(
    "Este nome de usuário já está em uso.",
  );
});
