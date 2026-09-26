/**
 * Sessão no navegador: o token de acesso fica só em memória; a renovação usa o cookie httpOnly
 * (que o JavaScript não lê) mais o token CSRF.
 */

/** Espera antes da 2ª tentativa: outra aba pode ter acabado de renovar e trocado o cookie. */
export const ESPERA_ENTRE_TENTATIVAS = 400;

let acesso: string | null = null;
let renovacaoEmAndamento: Promise<boolean> | null = null;
const ouvintes = new Set<() => void>();

export function tokenDeAcesso(): string | null {
  return acesso;
}

export function definirAcesso(token: string | null): void {
  acesso = token;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function aoMudarAcesso(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function lerCookie(nome: string): string | undefined {
  const par = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${nome}=`));
  return par === undefined ? undefined : decodeURIComponent(par.slice(nome.length + 1));
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function tentarRenovar(): Promise<boolean> {
  const resposta = await fetch(`${window.location.origin}/api/v1/auth/token/renovar`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRFToken": lerCookie("csrftoken") ?? "" },
  });
  if (!resposta.ok) return false;
  const corpo = (await resposta.json()) as { acesso: string };
  definirAcesso(corpo.acesso);
  return true;
}

/** Renova a sessão; chamadas simultâneas compartilham a mesma tentativa. */
export function renovarSessao({ insistir = false }: { insistir?: boolean } = {}): Promise<boolean> {
  renovacaoEmAndamento ??= (async () => {
    try {
      if (await tentarRenovar()) return true;
      if (insistir) {
        await esperar(ESPERA_ENTRE_TENTATIVAS);
        if (await tentarRenovar()) return true;
      }
      definirAcesso(null);
      return false;
    } catch {
      definirAcesso(null);
      return false;
    } finally {
      renovacaoEmAndamento = null;
    }
  })();
  return renovacaoEmAndamento;
}
