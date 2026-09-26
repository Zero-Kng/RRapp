/** Datas `YYYY-MM-DD` são lidas ao meio-dia local, para o fuso não trocar o dia. */
function lerData(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

/** Hoje no fuso do navegador, no formato `YYYY-MM-DD` (o mesmo do `<input type="date">`). */
export function hojeLocal(): string {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/** "20 de set. de 2026" */
export function formatarData(iso: string): string {
  return lerData(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "setembro de 2026" */
export function mesDoAno(iso: string): string {
  return lerData(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
