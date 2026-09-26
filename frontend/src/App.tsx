import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { codigoDeErro } from "./api/erros";
import { Rotas } from "./rotas";
import { SessaoProvider } from "./sessao/SessaoProvider";

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Repete só falhas de rede; erros da API (com código) não mudam tentando de novo
      retry: (falhas, erro) => codigoDeErro(erro) === undefined && falhas < 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <SessaoProvider>
        <BrowserRouter>
          <Rotas />
        </BrowserRouter>
      </SessaoProvider>
    </QueryClientProvider>
  );
}
