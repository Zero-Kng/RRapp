import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { servidor } from "./servidor";

// O 1º teste de cada arquivo ainda carrega módulos; 1 s (o padrão) deixa os findBy instáveis
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  servidor.resetHandlers();
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-tema");
});

afterAll(() => servidor.close());
