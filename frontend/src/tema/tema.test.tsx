import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { SeletorTema } from "./SeletorTema";
import { aplicarTema, lerTema } from "./tema";

const html = document.documentElement;

test("sem preferência segue o sistema", () => {
  expect(lerTema()).toBe("sistema");
  expect(html).not.toHaveAttribute("data-tema");
});

test("escolher escuro grava e aplica", () => {
  aplicarTema("escuro");

  expect(html.dataset.tema).toBe("escuro");
  expect(localStorage.getItem("rrapp-tema")).toBe("escuro");
  expect(lerTema()).toBe("escuro");
});

test("voltar para o sistema remove atributo e preferência", () => {
  aplicarTema("claro");
  aplicarTema("sistema");

  expect(html).not.toHaveAttribute("data-tema");
  expect(localStorage.getItem("rrapp-tema")).toBeNull();
});

test("valor inválido guardado vira sistema", () => {
  localStorage.setItem("rrapp-tema", "roxo");

  expect(lerTema()).toBe("sistema");
});

test("o seletor marca a opção atual e troca o tema", async () => {
  aplicarTema("claro");
  const usuario = userEvent.setup();
  render(<SeletorTema />);

  expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();

  await usuario.click(screen.getByRole("radio", { name: "Escuro" }));

  expect(html.dataset.tema).toBe("escuro");
  expect(screen.getByRole("radio", { name: "Escuro" })).toBeChecked();
});
