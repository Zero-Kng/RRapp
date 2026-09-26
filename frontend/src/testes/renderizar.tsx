import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import type { Eu } from "../api/tipos";
import { Rotas } from "../rotas";
import { SessaoProvider } from "../sessao/SessaoProvider";

type Opcoes = { rota?: string; usuario?: Eu | null };

/** Renderiza com consultas, sessão e rotas; sem `ui`, renderiza o app inteiro na `rota`. */
export function renderizar(ui?: ReactElement, { rota = "/", usuario = null }: Opcoes = {}) {
  const clienteConsultas = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const evento = userEvent.setup();
  const resultado = render(
    <QueryClientProvider client={clienteConsultas}>
      <SessaoProvider inicial={{ usuario }}>
        <MemoryRouter initialEntries={[rota]}>{ui ?? <Rotas />}</MemoryRouter>
      </SessaoProvider>
    </QueryClientProvider>,
  );
  return { evento, clienteConsultas, ...resultado };
}
