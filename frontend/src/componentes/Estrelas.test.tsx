import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { EstrelasNota } from "./EstrelasNota";
import { formatarNota, preenchimentos } from "../util/notas";
import { NotaEstrelas } from "./NotaEstrelas";

test("preenchimentos e formato da nota", () => {
  expect(preenchimentos(3.5)).toEqual([1, 1, 1, 0.5, 0]);
  expect(preenchimentos(0)).toEqual([0, 0, 0, 0, 0]);
  expect(formatarNota(3.5)).toBe("3,5");
  expect(formatarNota(4)).toBe("4");
});

test("exibição da nota tem rótulo acessível", () => {
  render(<NotaEstrelas valor={3.5} />);

  expect(screen.getByRole("img", { name: "3,5 de 5 estrelas" })).toBeInTheDocument();
});

function Controlado({ inicial = null }: { inicial?: number | null }) {
  const [valor, setValor] = useState<number | null>(inicial);
  return <EstrelasNota valor={valor} aoMudar={setValor} />;
}

function montar(inicial: number | null = null) {
  render(<Controlado inicial={inicial} />);
  const slider = screen.getByRole("slider", { name: "Nota" });
  vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
    left: 0,
    width: 100,
    top: 0,
    height: 32,
    right: 100,
    bottom: 32,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  return slider;
}

test("clicar na metade esquerda da 2ª estrela dá 1,5", () => {
  const slider = montar();

  fireEvent.click(slider, { clientX: 25 });

  expect(slider).toHaveAttribute("aria-valuetext", "1,5 de 5 estrelas");
});

test("clicar na metade direita da 4ª estrela dá 4", () => {
  const slider = montar();

  fireEvent.click(slider, { clientX: 75 });

  expect(slider).toHaveAttribute("aria-valuetext", "4 de 5 estrelas");
});

test("clicar de novo na mesma nota limpa", () => {
  const slider = montar();

  fireEvent.click(slider, { clientX: 75 });
  fireEvent.click(slider, { clientX: 75 });

  expect(slider).toHaveAttribute("aria-valuetext", "Sem nota");
});

test("setas ajustam de meia em meia estrela", async () => {
  const slider = montar();
  const usuario = userEvent.setup();
  slider.focus();

  await usuario.keyboard("{ArrowRight>7/}");
  expect(slider).toHaveAttribute("aria-valuetext", "3,5 de 5 estrelas");

  await usuario.keyboard("{ArrowLeft}");
  expect(slider).toHaveAttribute("aria-valuetext", "3 de 5 estrelas");

  await usuario.keyboard("{End}");
  expect(slider).toHaveAttribute("aria-valuetext", "5 de 5 estrelas");

  await usuario.keyboard("{Home}");
  expect(slider).toHaveAttribute("aria-valuetext", "0 de 5 estrelas");

  await usuario.keyboard("{Delete}");
  expect(slider).toHaveAttribute("aria-valuetext", "Sem nota");
});

test("arrastar com o botão pressionado ajusta a nota", () => {
  const slider = montar();

  fireEvent.pointerMove(slider, { clientX: 55, buttons: 1 });

  expect(slider).toHaveAttribute("aria-valuetext", "3 de 5 estrelas");
});
