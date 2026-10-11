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

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

function diasDeCalendario(de: Date, ate: Date): number {
  const meiaNoite = (data: Date) =>
    new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
  return Math.round((meiaNoite(ate) - meiaNoite(de)) / (24 * HORA));
}

/** Há quanto tempo algo foi postado: "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias" ou a data. */
export function tempoDesde(iso: string, agora: Date = new Date()): string {
  const momento = new Date(iso);
  const passado = agora.getTime() - momento.getTime();
  if (passado < MINUTO) return "agora";
  if (passado < HORA) return `há ${Math.floor(passado / MINUTO)} min`;
  if (passado < 24 * HORA) return `há ${Math.floor(passado / HORA)} h`;
  const dias = diasDeCalendario(momento, agora);
  if (dias <= 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return formatarData(iso);
}
