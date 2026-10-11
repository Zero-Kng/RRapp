import { Heart } from "lucide-react";
import { Link } from "react-router";
import type { Registro } from "../api/tipos";
import { Avatar } from "../componentes/Avatar";
import { classeFoco } from "../componentes/Botao";
import { NotaEstrelas } from "../componentes/NotaEstrelas";
import { tempoDesde } from "../util/datas";
import { CarrosselFotos } from "./CarrosselFotos";
import { TextoRecolhido } from "./TextoRecolhido";

/** Restaurante, estrelas, bairro e ♥, em branco sobre a foto ou sobre o pôster azul. */
function FichaSobreEscuro({ registro }: { registro: Registro }) {
  const { restaurante } = registro;
  return (
    <>
      <p className="flex items-center gap-2">
        <Link
          to={`/r/${restaurante.slug}`}
          className={`pointer-events-auto min-w-0 truncate rounded-md text-lg font-bold hover:underline focus-visible:outline-white ${classeFoco}`}
        >
          {restaurante.nome}
        </Link>
        {registro.curtiu && (
          <Heart role="img" aria-label="Curtiu" className="size-4 shrink-0 fill-white text-white" />
        )}
      </p>
      {(registro.nota !== null || restaurante.bairro) && (
        <p className="mt-0.5 flex items-center gap-2 text-sm text-white/90">
          {registro.nota !== null && <NotaEstrelas valor={registro.nota} sobreEscuro />}
          {restaurante.bairro && <span className="truncate">{restaurante.bairro}</span>}
        </p>
      )}
    </>
  );
}

/** Item do feed: foto como pôster (estilo Instagram) com a ficha do restaurante (Letterboxd). */
export function ItemDoFeed({ item }: { item: Registro }) {
  const { usuario } = item;

  return (
    <article className="-mx-4 border-y border-borda bg-superficie sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border">
      <header className="flex items-center gap-2 px-4 py-2.5 text-sm">
        <Link
          to={`/u/${usuario.username}`}
          className={`flex min-w-0 items-center gap-2.5 rounded-md font-semibold hover:text-destaque ${classeFoco}`}
        >
          <Avatar usuario={usuario} tamanho={32} />
          <span className="truncate">{usuario.nome_exibicao || usuario.username}</span>
        </Link>
        <span aria-hidden="true" className="text-texto-secundario">
          ·
        </span>
        <time dateTime={item.criado_em} className="shrink-0 text-texto-secundario">
          {tempoDesde(item.criado_em)}
        </time>
      </header>

      {item.fotos.length > 0 ? (
        <>
          <CarrosselFotos registro={item}>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-4 pt-12 pb-3 text-white">
              <FichaSobreEscuro registro={item} />
            </div>
          </CarrosselFotos>
          {item.critica && (
            <div className="px-4 py-3">
              <TextoRecolhido
                texto={item.critica}
                linhas={3}
                className="max-w-prose leading-relaxed"
                classeBotao="text-texto-secundario hover:text-texto"
              />
            </div>
          )}
        </>
      ) : (
        <div className="bg-linear-160 from-[#1d64d8] to-[#0e3a86] px-5 pt-7 pb-4 text-white">
          <TextoRecolhido
            texto={`“${item.critica}”`}
            linhas={6}
            className="text-xl leading-snug font-bold text-balance"
            classeBotao="text-white underline underline-offset-2 focus-visible:outline-white"
          />
          <div className="mt-6">
            <FichaSobreEscuro registro={item} />
          </div>
        </div>
      )}
    </article>
  );
}
