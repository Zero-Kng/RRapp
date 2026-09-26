import { http, HttpResponse } from "msw";
import { afterEach, expect, test } from "vitest";
import { servidor } from "../testes/servidor";
import { definirAcesso, renovarSessao, tokenDeAcesso } from "./sessao";

const RENOVAR = "*/api/v1/auth/token/renovar";

afterEach(() => {
  definirAcesso(null);
  document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

test("renova com o cookie CSRF e guarda o novo acesso", async () => {
  document.cookie = "csrftoken=abc";
  servidor.use(
    http.post(RENOVAR, ({ request }) =>
      request.headers.get("X-CSRFToken") === "abc"
        ? HttpResponse.json({ acesso: "novo" })
        : new HttpResponse(null, { status: 403 }),
    ),
  );

  expect(await renovarSessao()).toBe(true);
  expect(tokenDeAcesso()).toBe("novo");
});

test("chamadas simultâneas fazem uma única renovação", async () => {
  let chamadas = 0;
  servidor.use(
    http.post(RENOVAR, () => {
      chamadas += 1;
      return HttpResponse.json({ acesso: "novo" });
    }),
  );

  await Promise.all([renovarSessao(), renovarSessao()]);

  expect(chamadas).toBe(1);
});

test("sem insistir, uma falha limpa a sessão", async () => {
  let chamadas = 0;
  definirAcesso("velho");
  servidor.use(
    http.post(RENOVAR, () => {
      chamadas += 1;
      return new HttpResponse(null, { status: 401 });
    }),
  );

  expect(await renovarSessao()).toBe(false);
  expect(tokenDeAcesso()).toBeNull();
  expect(chamadas).toBe(1);
});

test("insistindo, tenta de novo porque outra aba pode ter renovado", async () => {
  let chamadas = 0;
  servidor.use(
    http.post(RENOVAR, () => {
      chamadas += 1;
      return chamadas === 1
        ? new HttpResponse(null, { status: 401 })
        : HttpResponse.json({ acesso: "da-outra-aba" });
    }),
  );

  expect(await renovarSessao({ insistir: true })).toBe(true);
  expect(tokenDeAcesso()).toBe("da-outra-aba");
  expect(chamadas).toBe(2);
});
