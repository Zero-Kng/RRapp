/** Só caminhos internos: impede que `?voltar=` leve para outro site. */
export function destinoSeguro(voltar: string | null): string {
  return voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
}
