import { Link } from "react-router";
import type { RestauranteResumo } from "../api/tipos";
import { formatarNota } from "../util/notas";
import { classeFoco } from "./Botao";
import { NotaEstrelas } from "./NotaEstrelas";

/** Uma linha da lista de restaurantes (busca, listas futuras). */
export function CartaoRestaurante({ restaurante }: { restaurante: RestauranteResumo }) {
  const detalhes = [
    restaurante.bairro,
    ...restaurante.categorias.slice(0, 2).map((categoria) => categoria.nome),
    restaurante.faixa_preco ? "$".repeat(restaurante.faixa_preco) : null,
  ].filter(Boolean);

  return (
    <Link
      to={`/r/${restaurante.slug}`}
      className={`group flex items-center gap-4 rounded-lg px-3 py-3.5 transition-colors hover:bg-superficie ${classeFoco}`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          <span className="truncate group-hover:text-destaque">{restaurante.nome}</span>
          {restaurante.status === "fechado" && (
            <span className="shrink-0 rounded-md border border-borda px-1.5 py-0.5 text-xs font-medium text-texto-secundario">
              Fechado
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-sm text-texto-secundario">{detalhes.join(" · ")}</p>
      </div>
      <div className="shrink-0 text-right">
        {restaurante.nota_media === null ? (
          <p className="text-sm text-texto-secundario">Sem avaliações</p>
        ) : (
          <>
            <p className="flex items-center justify-end gap-1.5">
              <NotaEstrelas valor={restaurante.nota_media} tamanho={14} />
              <span className="text-sm font-semibold tabular-nums">
                {formatarNota(restaurante.nota_media)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-texto-secundario tabular-nums">
              {restaurante.total_avaliacoes}{" "}
              {restaurante.total_avaliacoes === 1 ? "avaliação" : "avaliações"}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}
