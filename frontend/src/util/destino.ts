/** Só caminhos internos: impede que `?voltar=` leve para outro site. */
export function destinoSeguro(voltar: string | null): string {
  // O navegador trata "\" como "/" e ignora tab e quebra de linha: "/\site.com" vira "//site.com"
  // eslint-disable-next-line no-control-regex
  if (!voltar?.startsWith("/") || /[\\\u0000-\u001f]/.test(voltar)) return "/";
  const url = new URL(voltar, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/";
}
