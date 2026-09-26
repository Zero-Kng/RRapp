import { expect, test, vi } from "vitest";
import { aplicarErros, codigoDeErro, dados, errosDeCampo, mensagemDeErro } from "./erros";

const corpo = (campos: Record<string, unknown> = {}) => ({
  erro: { codigo: "dados_invalidos", mensagem: "Dados inválidos.", campos },
});

test("mensagem e código vêm do corpo de erro da API", () => {
  expect(mensagemDeErro(corpo())).toBe("Dados inválidos.");
  expect(codigoDeErro(corpo())).toBe("dados_invalidos");
});

test("falha de rede e erros desconhecidos têm mensagens próprias", () => {
  expect(mensagemDeErro(new TypeError("Failed to fetch"))).toBe(
    "Sem conexão com o servidor. Verifique a internet e tente de novo.",
  );
  expect(mensagemDeErro("???")).toBe("Algo deu errado. Tente de novo.");
  expect(codigoDeErro(new Error("x"))).toBeUndefined();
});

test("erros de campo pegam a primeira mensagem de cada campo", () => {
  expect(errosDeCampo(corpo({ nota: ["Inválida.", "Outra."], geral: "Texto solto." }))).toEqual({
    nota: "Inválida.",
    geral: "Texto solto.",
  });
  expect(errosDeCampo(new Error("x"))).toEqual({});
});

test("aplicarErros marca os campos do formulário", () => {
  const definirErro = vi.fn();

  const geral = aplicarErros(corpo({ nota: ["Inválida."] }), definirErro, ["nota"] as const);

  expect(definirErro).toHaveBeenCalledWith("nota", { type: "server", message: "Inválida." });
  expect(geral).toBeNull();
});

test("aplicarErros devolve a mensagem geral quando nenhum campo do formulário foi afetado", () => {
  const definirErro = vi.fn();

  const geral = aplicarErros(corpo({ outro: ["x"] }), definirErro, ["nota"] as const);

  expect(definirErro).not.toHaveBeenCalled();
  expect(geral).toBe("Dados inválidos.");
});

test("dados devolve o corpo ou lança o erro", async () => {
  await expect(dados(Promise.resolve({ data: { ok: true } }))).resolves.toEqual({ ok: true });
  await expect(dados(Promise.resolve({ error: corpo() }))).rejects.toEqual(corpo());
});
