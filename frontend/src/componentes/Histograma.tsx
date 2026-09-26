import type { BarraHistograma } from "../api/tipos";
import { formatarNota } from "../util/notas";

/** Distribuição das notas em 11 faixas (0 a 5 estrelas), como no Letterboxd. */
export function Histograma({ barras }: { barras: BarraHistograma[] }) {
  const maior = Math.max(1, ...barras.map((barra) => barra.quantidade));
  const descricao = barras
    .filter((barra) => barra.quantidade > 0)
    .map((barra) => `${formatarNota(barra.nota)} estrelas: ${barra.quantidade}`)
    .join("; ");

  return (
    <figure
      role="img"
      aria-label={`Distribuição das notas: ${descricao || "sem avaliações"}`}
      className="w-full max-w-64"
    >
      <div className="flex h-14 items-end gap-0.5">
        {barras.map((barra) => (
          <span
            key={barra.nota}
            className="flex-1 rounded-t-sm bg-estrela/80"
            style={{ height: `${Math.max(4, (barra.quantidade / maior) * 100)}%` }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="mt-1 flex justify-between text-xs text-texto-secundario tabular-nums"
      >
        <span>0</span>
        <span>5</span>
      </div>
    </figure>
  );
}
