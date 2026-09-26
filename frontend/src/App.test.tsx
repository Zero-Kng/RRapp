import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { App } from "./App";
import { servidor } from "./testes/servidor";

test("abre o app anônimo com o logotipo e o link para o início", async () => {
  servidor.use(
    http.post("*/api/v1/auth/token/renovar", () => new HttpResponse(null, { status: 401 })),
  );

  render(<App />);

  expect(await screen.findByRole("link", { name: "rrapp" })).toHaveAttribute("href", "/");
});
