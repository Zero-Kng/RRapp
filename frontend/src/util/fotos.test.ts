import { expect, test } from "vitest";
import { validarFoto } from "./fotos";

const arquivo = (nome: string, tipo: string, tamanho = 10) =>
  new File([new Uint8Array(tamanho)], nome, { type: tipo });

test.each([
  ["IMG_1.HEIC", ""],
  ["foto.heif", ""],
  ["prato.jpg", "image/jpeg"],
  ["prato.png", "image/png"],
  ["prato.webp", "image/webp"],
  ["IMG_2.heic", "image/heic"],
])("aceita %s (tipo '%s')", (nome, tipo) => {
  expect(validarFoto(arquivo(nome, tipo))).toBeNull();
});

test("recusa GIF", () => {
  expect(validarFoto(arquivo("anima.gif", "image/gif"))).toBe(
    "Envie uma imagem JPG, PNG, WebP ou HEIC.",
  );
});

test("recusa arquivo sem tipo e sem extensão de imagem", () => {
  expect(validarFoto(arquivo("documento.pdf", ""))).toBe(
    "Envie uma imagem JPG, PNG, WebP ou HEIC.",
  );
});

test("recusa acima de 10 MB", () => {
  expect(validarFoto(arquivo("grande.jpg", "image/jpeg", 10 * 1024 * 1024 + 1))).toBe(
    "A imagem deve ter no máximo 10 MB.",
  );
});
