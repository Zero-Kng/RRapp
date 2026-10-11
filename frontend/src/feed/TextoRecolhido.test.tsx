import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from "vitest";
import { TextoRecolhido } from "./TextoRecolhido";

let altura = 60;
let redimensionar: () => void = () => {};

beforeEach(() => {
  altura = 60;
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(() => altura);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(60);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        redimensionar = () => callback([], this as unknown as ResizeObserver);
      }
      observe() {}
      disconnect() {
        redimensionar = () => {};
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("texto que passa a não caber depois de mudar a largura ganha 'ver mais'", () => {
  render(<TextoRecolhido texto="Crítica." linhas={3} />);
  expect(screen.queryByRole("button", { name: "ver mais" })).not.toBeInTheDocument();

  altura = 200; // a tela girou: agora o texto precisa de mais linhas
  act(() => redimensionar());

  expect(screen.getByRole("button", { name: "ver mais" })).toBeVisible();
});

test("texto que passa a não caber depois de a fonte carregar ganha 'ver mais'", async () => {
  let fonteCarregou: () => void = () => {};
  const pronta = new Promise<void>((resolver) => (fonteCarregou = resolver));
  // O jsdom não tem document.fonts
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: pronta } });
  onTestFinished(() => {
    Reflect.deleteProperty(document, "fonts");
  });
  render(<TextoRecolhido texto="Crítica." linhas={3} />);
  expect(screen.queryByRole("button", { name: "ver mais" })).not.toBeInTheDocument();

  altura = 200; // a fonte do app é mais larga que a reserva
  await act(async () => fonteCarregou());

  expect(await screen.findByRole("button", { name: "ver mais" })).toBeVisible();
});
