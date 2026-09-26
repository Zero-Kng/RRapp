export type Preenchimento = 0 | 0.5 | 1;

/** 3.5 → "3,5"; 4 → "4". */
export function formatarNota(nota: number): string {
  return nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Quanto de cada uma das 5 estrelas fica preenchido. */
export function preenchimentos(valor: number): Preenchimento[] {
  return [1, 2, 3, 4, 5].map((n) => (valor >= n ? 1 : valor >= n - 0.5 ? 0.5 : 0));
}
