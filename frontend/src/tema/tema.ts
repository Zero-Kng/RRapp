export type Tema = "sistema" | "claro" | "escuro";

const CHAVE = "rrapp-tema";

/** Preferência salva; sem preferência (ou sem acesso ao armazenamento) segue o sistema. */
export function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo === "claro" || salvo === "escuro" ? salvo : "sistema";
  } catch {
    return "sistema";
  }
}

/** Aplica no <html> (o CSS lê `data-tema`) e guarda a escolha. */
export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", tema);

  try {
    if (tema === "sistema") localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, tema);
  } catch {
    // navegador sem armazenamento: o tema vale só até recarregar
  }
}
