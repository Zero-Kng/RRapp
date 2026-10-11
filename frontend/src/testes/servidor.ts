import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { paginaDoFeed } from "./dados";

/**
 * Servidor de API simulado para os testes; cada teste acrescenta seus handlers.
 * O feed vazio é o padrão: o Início aparece em muitos testes que não tratam dele.
 */
export const servidor = setupServer(
  http.get("*/api/v1/feed", () => HttpResponse.json(paginaDoFeed([]))),
);
