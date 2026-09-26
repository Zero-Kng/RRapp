import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";

test("mostra o logotipo com link para o início", () => {
  render(<App />);

  expect(screen.getByRole("link", { name: "rrapp" })).toHaveAttribute("href", "/");
});
