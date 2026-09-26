import { useEffect } from "react";

/** Título da aba do navegador: "Buscar · rrapp". */
export function useTitulo(titulo: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} · rrapp` : "rrapp";
  }, [titulo]);
}
