import { useLayoutEffect, useRef, useState } from "react";
import { classeFoco } from "../componentes/Botao";

// Classes inteiras (não montadas), para o Tailwind encontrá-las
const CORTE = { 3: "line-clamp-3", 6: "line-clamp-6" } as const;

type Props = {
  texto: string;
  linhas: keyof typeof CORTE;
  className?: string;
  classeBotao?: string;
};

/** Texto cortado em algumas linhas; "ver mais" só aparece se ele não couber. */
export function TextoRecolhido({ texto, linhas, className = "", classeBotao = "" }: Props) {
  const paragrafo = useRef<HTMLParagraphElement>(null);
  const [aberto, setAberto] = useState(false);
  const [transborda, setTransborda] = useState(false);

  useLayoutEffect(() => {
    const elemento = paragrafo.current;
    if (elemento) setTransborda(elemento.scrollHeight > elemento.clientHeight + 1);
  }, [texto, linhas]);

  return (
    <div>
      <p
        ref={paragrafo}
        className={`whitespace-pre-line ${aberto ? "" : CORTE[linhas]} ${className}`}
      >
        {texto}
      </p>
      {transborda && !aberto && (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setAberto(true)}
          className={`mt-1 rounded-md text-sm font-semibold ${classeFoco} ${classeBotao}`}
        >
          ver mais
        </button>
      )}
    </div>
  );
}
