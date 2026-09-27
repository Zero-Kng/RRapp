import { Heart, RotateCcw } from "lucide-react";
import { Link } from "react-router";
import type { Registro } from "../api/tipos";
import { formatarData } from "../util/datas";
import { MiniaturasFotos } from "../registros/MiniaturasFotos";
import { Avatar } from "./Avatar";
import { classeFoco } from "./Botao";
import { NotaEstrelas } from "./NotaEstrelas";

type Props = {
  registro: Registro;
  /** Na página do restaurante mostra quem escreveu; no diário, qual restaurante. */
  mostrar: "usuario" | "restaurante";
};

export function CartaoRegistro({ registro, mostrar }: Props) {
  const { usuario, restaurante } = registro;

  return (
    <article className="py-4">
      <header className="flex items-center gap-3">
        {mostrar === "usuario" ? (
          <Link
            to={`/u/${usuario.username}`}
            className={`flex min-w-0 items-center gap-2.5 rounded-md font-semibold hover:text-destaque ${classeFoco}`}
          >
            <Avatar usuario={usuario} tamanho={32} />
            <span className="truncate">{usuario.nome_exibicao || usuario.username}</span>
          </Link>
        ) : (
          <Link
            to={`/r/${restaurante.slug}`}
            className={`min-w-0 truncate rounded-md font-semibold hover:text-destaque ${classeFoco}`}
          >
            {restaurante.nome}
          </Link>
        )}
        <time
          dateTime={registro.data_visita}
          className="ml-auto shrink-0 text-sm text-texto-secundario"
        >
          {formatarData(registro.data_visita)}
        </time>
      </header>

      {(registro.nota !== null || registro.curtiu || registro.revisita) && (
        <p className="mt-2 flex items-center gap-2">
          {registro.nota !== null && <NotaEstrelas valor={registro.nota} tamanho={16} />}
          {registro.curtiu && (
            <Heart role="img" aria-label="Curtiu" className="size-4 fill-erro text-erro" />
          )}
          {registro.revisita && (
            <RotateCcw
              role="img"
              aria-label="Já tinha ido antes"
              className="size-4 text-texto-secundario"
            />
          )}
        </p>
      )}

      {registro.critica && (
        <p className="mt-2 max-w-prose leading-relaxed whitespace-pre-line">{registro.critica}</p>
      )}

      <MiniaturasFotos registro={registro} />
    </article>
  );
}
