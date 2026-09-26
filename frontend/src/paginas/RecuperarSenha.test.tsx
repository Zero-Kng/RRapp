import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { renderizar } from "../testes/renderizar";
import { servidor } from "../testes/servidor";

const MENSAGEM = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.";

test("pedido de redefinição mostra a mensagem da API e esconde o formulário", async () => {
  servidor.use(
    http.post("*/api/v1/auth/senha/esqueci", () =>
      HttpResponse.json({ mensagem: MENSAGEM }, { status: 202 }),
    ),
  );
  const { evento } = renderizar(undefined, { rota: "/esqueci-senha" });

  await evento.type(screen.getByLabelText("E-mail"), "ana@example.com");
  await evento.click(screen.getByRole("button", { name: "Enviar link" }));

  expect(await screen.findByRole("status")).toHaveTextContent(MENSAGEM);
  expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
});

async function preencherNovaSenha(
  evento: ReturnType<typeof renderizar>["evento"],
  nova: string,
  confirmacao = nova,
) {
  await evento.type(screen.getByLabelText("Nova senha"), nova);
  await evento.type(screen.getByLabelText("Confirmar nova senha"), confirmacao);
  await evento.click(screen.getByRole("button", { name: "Redefinir senha" }));
}

test("redefinir com link válido confirma e oferece entrar", async () => {
  let corpo: unknown;
  servidor.use(
    http.post("*/api/v1/auth/senha/redefinir", async ({ request }) => {
      corpo = await request.json();
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const { evento } = renderizar(undefined, { rota: "/redefinir-senha?uid=MQ&token=abc" });

  await preencherNovaSenha(evento, "outra-senha-forte");

  expect(await screen.findByRole("status")).toHaveTextContent("Senha redefinida.");
  expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
  expect(corpo).toEqual({ uid: "MQ", token: "abc", nova_senha: "outra-senha-forte" });
});

test("senhas diferentes não são enviadas", async () => {
  const { evento } = renderizar(undefined, { rota: "/redefinir-senha?uid=MQ&token=abc" });

  await preencherNovaSenha(evento, "outra-senha-forte", "outra-coisa-123");

  expect(await screen.findByText("As senhas não conferem.")).toBeVisible();
});

test("link inválido explica e oferece pedir outro", async () => {
  servidor.use(
    http.post("*/api/v1/auth/senha/redefinir", () =>
      HttpResponse.json(
        {
          erro: {
            codigo: "link_invalido",
            mensagem: "Este link é inválido ou expirou. Peça um novo.",
            campos: {},
          },
        },
        { status: 400 },
      ),
    ),
  );
  const { evento } = renderizar(undefined, { rota: "/redefinir-senha?uid=MQ&token=abc" });

  await preencherNovaSenha(evento, "outra-senha-forte");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Este link é inválido ou expirou. Peça um novo.",
  );
  expect(screen.getByRole("link", { name: "Pedir novo link" })).toHaveAttribute(
    "href",
    "/esqueci-senha",
  );
});

test("link sem uid ou token", () => {
  renderizar(undefined, { rota: "/redefinir-senha" });

  expect(screen.getByRole("alert")).toHaveTextContent("Este link está incompleto.");
  expect(screen.getByRole("link", { name: "Pedir novo link" })).toBeVisible();
});
