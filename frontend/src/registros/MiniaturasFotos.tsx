import { useState } from "react";
import type { Registro } from "../api/tipos";
import { classeFoco } from "../componentes/Botao";
import { TelaCheiaFotos } from "./TelaCheiaFotos";

/** Linha de miniaturas das fotos de um registro; tocar abre a tela cheia. */
export function MiniaturasFotos({ registro }: { registro: Registro }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const total = registro.fotos.length;
  if (total === 0) return null;

  return (
    <>
      <div className="mt-3 flex gap-2">
        {registro.fotos.map((foto, indice) => (
          <button
            key={foto.id}
            type="button"
            aria-label={`Ver foto ${indice + 1} de ${total}`}
            onClick={() => setAberta(indice)}
            className={`size-16 shrink-0 overflow-hidden rounded-lg border border-borda bg-fundo ${classeFoco}`}
          >
            <img
              src={foto.miniatura}
              alt=""
              loading="lazy"
              width={foto.largura}
              height={foto.altura}
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
      {aberta !== null && (
        <TelaCheiaFotos
          key={aberta}
          registro={registro}
          inicial={aberta}
          aberto
          aoMudarAberto={(abrir) => !abrir && setAberta(null)}
        />
      )}
    </>
  );
}
