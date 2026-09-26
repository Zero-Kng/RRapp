import { http, HttpResponse } from "msw";
import { afterEach, expect, test } from "vitest";
import { eu } from "../testes/dados";
import { servidor } from "../testes/servidor";
import { api } from "./cliente";
import { definirAcesso, tokenDeAcesso } from "./sessao";

const EU = "*/api/v1/auth/eu";
const RENOVAR = "*/api/v1/auth/token/renovar";

afterEach(() => definirAcesso(null));

test("envia o token de acesso", async () => {
  definirAcesso("t1");
  servidor.use(
    http.get(EU, ({ request }) =>
      request.headers.get("Authorization") === "Bearer t1"
        ? HttpResponse.json(eu)
        : new HttpResponse(null, { status: 401 }),
    ),
  );

  const { data } = await api.GET("/api/v1/auth/eu");

  expect(data?.username).toBe("ana");
});

test("num 401 renova e repete a requisição com o novo token", async () => {
  definirAcesso("t1");
  servidor.use(
    http.get(EU, ({ request }) =>
      request.headers.get("Authorization") === "Bearer t2"
        ? HttpResponse.json(eu)
        : HttpResponse.json(
            { erro: { codigo: "nao_autenticado", mensagem: "Expirado.", campos: {} } },
            { status: 401 },
          ),
    ),
    http.post(RENOVAR, () => HttpResponse.json({ acesso: "t2" })),
  );

  const { data } = await api.GET("/api/v1/auth/eu");

  expect(data?.username).toBe("ana");
  expect(tokenDeAcesso()).toBe("t2");
});

test("se a renovação falhar, devolve o 401 e limpa a sessão", async () => {
  definirAcesso("t1");
  servidor.use(
    http.get(EU, () => new HttpResponse(null, { status: 401 })),
    http.post(RENOVAR, () => new HttpResponse(null, { status: 401 })),
  );

  const { response } = await api.GET("/api/v1/auth/eu");

  expect(response.status).toBe(401);
  expect(tokenDeAcesso()).toBeNull();
});

test("login com senha errada não tenta renovar", async () => {
  definirAcesso("antigo");
  let renovou = false;
  let autorizacaoNoLogin: string | null = "nao-conferido";
  servidor.use(
    http.post("*/api/v1/auth/login", ({ request }) => {
      autorizacaoNoLogin = request.headers.get("Authorization");
      return HttpResponse.json(
        {
          erro: {
            codigo: "credenciais_invalidas",
            mensagem: "E-mail/usuário ou senha incorretos.",
            campos: {},
          },
        },
        { status: 401 },
      );
    }),
    http.post(RENOVAR, () => {
      renovou = true;
      return HttpResponse.json({ acesso: "x" });
    }),
  );

  const { error } = await api.POST("/api/v1/auth/login", {
    body: { login: "ana", senha: "errada" },
  });

  expect(error?.erro.codigo).toBe("credenciais_invalidas");
  expect(renovou).toBe(false);
  expect(autorizacaoNoLogin).toBeNull();
});

test("POST com corpo JSON pode ser repetido depois da renovação", async () => {
  definirAcesso("t1");
  const corpos: unknown[] = [];
  servidor.use(
    http.post("*/api/v1/registros", async ({ request }) => {
      corpos.push(await request.json());
      return corpos.length === 1
        ? new HttpResponse(null, { status: 401 })
        : HttpResponse.json({ id: 1 }, { status: 201 });
    }),
    http.post(RENOVAR, () => HttpResponse.json({ acesso: "t2" })),
  );

  const { response } = await api.POST("/api/v1/registros", {
    body: { restaurante_slug: "bar-do-ze", nota: 3.5 },
  });

  expect(response.status).toBe(201);
  expect(corpos).toEqual([
    { restaurante_slug: "bar-do-ze", nota: 3.5 },
    { restaurante_slug: "bar-do-ze", nota: 3.5 },
  ]);
});
