type CorpoErro = {
  erro: { codigo: string; mensagem: string; campos: Record<string, unknown> };
};

function ehCorpoErro(valor: unknown): valor is CorpoErro {
  return typeof valor === "object" && valor !== null && "erro" in valor;
}

export function codigoDeErro(erro: unknown): string | undefined {
  return ehCorpoErro(erro) ? erro.erro.codigo : undefined;
}

export function mensagemDeErro(erro: unknown): string {
  if (ehCorpoErro(erro)) return erro.erro.mensagem;
  if (erro instanceof TypeError) {
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  }
  return "Algo deu errado. Tente de novo.";
}

export function errosDeCampo(erro: unknown): Record<string, string> {
  if (!ehCorpoErro(erro)) return {};
  const campos: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(erro.erro.campos ?? {})) {
    const primeira = Array.isArray(valor) ? valor[0] : valor;
    if (typeof primeira === "string") campos[campo] = primeira;
  }
  return campos;
}

/** Devolve o corpo da resposta ou lança o corpo de erro (para o TanStack Query tratar). */
export async function dados<T>(chamada: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data, error } = await chamada;
  if (error !== undefined) throw error;
  return data as T;
}

/**
 * Coloca os erros do servidor nos campos do formulário.
 * Devolve a mensagem geral só quando nenhum campo do formulário recebeu erro.
 */
export function aplicarErros<C extends string>(
  erro: unknown,
  definirErro: (campo: C, detalhe: { type: string; message: string }) => void,
  campos: readonly C[],
): string | null {
  const porCampo = errosDeCampo(erro);
  let algum = false;
  for (const campo of campos) {
    if (porCampo[campo]) {
      definirErro(campo, { type: "server", message: porCampo[campo] });
      algum = true;
    }
  }
  return algum ? null : mensagemDeErro(erro);
}
