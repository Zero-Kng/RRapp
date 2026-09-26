import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, expect, test } from "vitest";
import { definirAcesso } from "../api/sessao";
import { eu } from "../testes/dados";
import { servidor } from "../testes/servidor";
import { useSessao } from "./contexto";
import { SessaoProvider } from "./SessaoProvider";

afterEach(() => definirAcesso(null));

function Sonda() {
  const { usuario, carregando, sair } = useSessao();
  if (carregando) return <p>carregando</p>;
  return (
    <>
      <p>{usuario ? usuario.username : "anônimo"}</p>
      <button onClick={() => void sair()}>sair</button>
    </>
  );
}

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>
    </QueryClientProvider>,
  );
}

test("ao abrir, recupera a sessão pelo cookie", async () => {
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => HttpResponse.json({ acesso: "t" })),
    http.get("*/api/v1/auth/eu", () => HttpResponse.json(eu)),
  );

  montar();

  expect(await screen.findByText("ana")).toBeInTheDocument();
});

test("sem sessão, fica anônimo", async () => {
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => new HttpResponse(null, { status: 401 })),
  );

  montar();

  expect(await screen.findByText("anônimo")).toBeInTheDocument();
});

test("sair chama o logout e esquece o usuário", async () => {
  let saiu = false;
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => HttpResponse.json({ acesso: "t" })),
    http.get("*/api/v1/auth/eu", () => HttpResponse.json(eu)),
    http.post("*/api/v1/auth/logout", () => {
      saiu = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  montar();
  await screen.findByText("ana");

  await userEvent.click(screen.getByRole("button", { name: "sair" }));

  expect(await screen.findByText("anônimo")).toBeInTheDocument();
  expect(saiu).toBe(true);
});

test("se a sessão expirar durante o uso, o usuário é esquecido", async () => {
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => HttpResponse.json({ acesso: "t" })),
    http.get("*/api/v1/auth/eu", () => HttpResponse.json(eu)),
  );
  montar();
  await screen.findByText("ana");

  act(() => definirAcesso(null));

  expect(await screen.findByText("anônimo")).toBeInTheDocument();
});

test("recuperar a sessão recarrega as consultas sem tirar os dados da tela", async () => {
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => HttpResponse.json({ acesso: "t" })),
    http.get("*/api/v1/auth/eu", () => HttpResponse.json(eu)),
  );
  const clienteConsultas = new QueryClient();
  const chave = ["perfil", "ana"];
  clienteConsultas.setQueryData(chave, { username: "ana" });

  render(
    <QueryClientProvider client={clienteConsultas}>
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>
    </QueryClientProvider>,
  );

  expect(await screen.findByText("ana")).toBeInTheDocument();
  // Zerar os dados faria a página piscar em "Carregando" e remontar (perdendo a aba escolhida)
  await waitFor(() => expect(clienteConsultas.getQueryState(chave)?.isInvalidated).toBe(true));
  expect(clienteConsultas.getQueryData(chave)).toEqual({ username: "ana" });
});

test("quando a sessão de alguém expira, os dados dessa pessoa saem do cache", async () => {
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => HttpResponse.json({ acesso: "t" })),
    http.get("*/api/v1/auth/eu", () => HttpResponse.json(eu)),
  );
  const clienteConsultas = new QueryClient();
  render(
    <QueryClientProvider client={clienteConsultas}>
      <SessaoProvider>
        <Sonda />
      </SessaoProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("ana");
  // Dado que depende de quem vê (ex.: o ♡ e "Sua última visita" de ana)
  const chave = ["restaurante", "aprazivel-santa-teresa"];
  clienteConsultas.setQueryData(chave, { na_minha_lista_de_desejos: true });

  act(() => definirAcesso(null));

  expect(await screen.findByText("anônimo")).toBeInTheDocument();
  // Se ficasse só "velho", quem entrasse depois na mesma aba veria por um instante os dados de ana
  await waitFor(() => expect(clienteConsultas.getQueryData(chave)).toBeUndefined());
});
