import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./esquema";
import { renovarSessao, tokenDeAcesso } from "./sessao";

/** Rotas em que um 401 significa "credenciais erradas", não "sessão expirada". */
function dispensaToken(url: string): boolean {
  const caminho = new URL(url).pathname;
  return (
    caminho === "/api/v1/auth/login" ||
    caminho === "/api/v1/auth/cadastro" ||
    caminho.startsWith("/api/v1/auth/senha/")
  );
}

// Cópias das requisições autenticadas, para repetir depois de renovar a sessão
const copias = new Map<string, Request>();

const autenticacao: Middleware = {
  onRequest({ request, id }) {
    const token = tokenDeAcesso();
    if (!token || dispensaToken(request.url)) return request;
    request.headers.set("Authorization", `Bearer ${token}`);
    copias.set(id, request.clone());
    return request;
  },
  async onResponse({ response, id }) {
    const copia = copias.get(id);
    copias.delete(id);
    if (response.status !== 401 || !copia) return response;
    if (!(await renovarSessao({ insistir: true }))) return response;
    copia.headers.set("Authorization", `Bearer ${tokenDeAcesso()}`);
    return fetch(copia);
  },
  onError({ id }) {
    copias.delete(id);
  },
};

export const api = createClient<paths>({
  baseUrl: window.location.origin,
  // Resolve o fetch a cada chamada (e não na criação), para ferramentas como o MSW interceptarem
  fetch: (requisicao) => globalThis.fetch(requisicao),
});
api.use(autenticacao);
