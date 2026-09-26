import { setupServer } from "msw/node";

/** Servidor de API simulado para os testes; cada teste acrescenta seus handlers. */
export const servidor = setupServer();
