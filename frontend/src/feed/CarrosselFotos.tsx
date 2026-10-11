import { useState, type ReactNode, type UIEvent } from "react";
import type { Registro } from "../api/tipos";
import { TelaCheiaFotos } from "../registros/TelaCheiaFotos";
import { proporcaoDoPoster } from "../util/fotos";

type Props = {
  registro: Registro;
  /** Sobreposição desenhada por cima das fotos (o degradê com o restaurante). */
  children?: ReactNode;
  /** Só os primeiros itens do feed baixam a 1ª foto na hora; o resto espera a rolagem. */
  prioritaria?: boolean;
};

/** Fotos de um registro na largura toda, deslizando para o lado; tocar abre a tela cheia. */
export function CarrosselFotos({ registro, children, prioritaria = false }: Props) {
  const [atual, setAtual] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);
  const { fotos } = registro;
  const total = fotos.length;
  if (total === 0) return null;

  function aoRolar(evento: UIEvent<HTMLDivElement>) {
    const { scrollLeft, clientWidth } = evento.currentTarget;
    if (clientWidth > 0) setAtual(Math.min(total - 1, Math.round(scrollLeft / clientWidth)));
  }

  return (
    <div
      role="region"
      aria-label="Fotos da visita"
      aria-roledescription="carrossel"
      className="relative overflow-hidden bg-black"
      style={{ aspectRatio: proporcaoDoPoster(fotos[0]) }}
    >
      <div
        onScroll={aoRolar}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((foto, indice) => (
          <button
            key={foto.id}
            type="button"
            aria-label={`Ver foto ${indice + 1} de ${total}`}
            onClick={() => setAberta(indice)}
            className="size-full shrink-0 snap-center focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
          >
            <img
              src={foto.imagem}
              alt=""
              width={foto.largura}
              height={foto.altura}
              loading={indice === 0 && prioritaria ? undefined : "lazy"}
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
      {total > 1 && (
        <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
          {`${atual + 1}/${total}`}
        </span>
      )}
      {children}
      {aberta !== null && (
        <TelaCheiaFotos
          key={aberta}
          registro={registro}
          inicial={aberta}
          aberto
          aoMudarAberto={(abrir) => !abrir && setAberta(null)}
        />
      )}
    </div>
  );
}
