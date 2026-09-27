import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { classeFoco } from "../componentes/Botao";
import {
  ACEITAS_NO_SELETOR,
  MAXIMO_FOTOS,
  MENSAGEM_LIMITE_FOTOS,
  validarFoto,
} from "../util/fotos";

type Props = {
  fotos: File[];
  aoMudar: (fotos: File[]) => void;
  desabilitado?: boolean;
};

/** Escolha de até 4 fotos (galeria ou câmera), com prévia e botão para tirar cada uma. */
export function CampoFotos({ fotos, aoMudar, desabilitado = false }: Props) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const previas = useMemo(
    () =>
      fotos.map((foto) =>
        typeof URL.createObjectURL === "function" ? URL.createObjectURL(foto) : "",
      ),
    [fotos],
  );

  // Libera as URLs das prévias quando a lista muda ou o campo sai da tela
  useEffect(
    () => () => {
      for (const previa of previas) if (previa) URL.revokeObjectURL(previa);
    },
    [previas],
  );

  function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const escolhidas = Array.from(evento.target.files ?? []);
    evento.target.value = ""; // escolher o mesmo arquivo de novo também dispara a mudança
    const invalida = escolhidas.map(validarFoto).find(Boolean) ?? null;
    const validas = escolhidas.filter((foto) => validarFoto(foto) === null);
    const juntas = [...fotos, ...validas];
    setErro(juntas.length > MAXIMO_FOTOS ? MENSAGEM_LIMITE_FOTOS : invalida);
    aoMudar(juntas.slice(0, MAXIMO_FOTOS));
  }

  function tirar(indice: number) {
    setErro(null);
    aoMudar(fotos.filter((_, i) => i !== indice));
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Fotos (até {MAXIMO_FOTOS})
      </label>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={ACEITAS_NO_SELETOR}
        multiple
        disabled={desabilitado}
        onChange={aoEscolher}
        className="sr-only"
      />
      <div className="flex flex-wrap gap-3">
        {fotos.map((foto, indice) => (
          <div key={`${foto.name}-${indice}`} className="relative size-16">
            {previas[indice] ? (
              <img
                src={previas[indice]}
                alt=""
                className="size-full rounded-lg border border-borda object-cover"
              />
            ) : (
              <div className="size-full rounded-lg border border-borda bg-fundo" />
            )}
            <button
              type="button"
              aria-label={`Tirar foto ${indice + 1}`}
              disabled={desabilitado}
              onClick={() => tirar(indice)}
              className={`absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-texto text-superficie ${classeFoco}`}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ))}
        {fotos.length < MAXIMO_FOTOS && (
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => entrada.current?.click()}
            className={`inline-flex size-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-borda text-xs text-texto-secundario hover:border-destaque hover:text-destaque ${classeFoco}`}
          >
            <ImagePlus aria-hidden="true" className="size-5" />
            Adicionar
          </button>
        )}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
