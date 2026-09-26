import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { formatarNota, preenchimentos } from "../util/notas";
import { classeFoco } from "./Botao";
import { Estrela } from "./NotaEstrelas";

type Props = {
  valor: number | null;
  aoMudar: (valor: number | null) => void;
  rotulo?: string;
  tamanho?: number;
  idDescricao?: string;
};

/** Metade esquerda de uma estrela = meia estrela; nunca abaixo de 0,5 pelo toque. */
function valorNaPosicao(elemento: HTMLElement, x: number): number {
  const { left, width } = elemento.getBoundingClientRect();
  if (width <= 0) return 0.5;
  const estrelas = ((x - left) / width) * 5;
  return Math.min(5, Math.max(0.5, Math.ceil(estrelas * 2) / 2));
}

function valorPelaTecla(tecla: string, atual: number | null): number | null | undefined {
  const base = atual ?? 0;
  switch (tecla) {
    case "ArrowRight":
    case "ArrowUp":
      return Math.min(5, base + 0.5);
    case "ArrowLeft":
    case "ArrowDown":
      return Math.max(0, base - 0.5);
    case "Home":
      return 0;
    case "End":
      return 5;
    case "Delete":
    case "Backspace":
      return null;
    default:
      return undefined;
  }
}

/** Entrada da nota em meias estrelas: toque, arraste ou teclado. Tocar na nota atual limpa. */
export function EstrelasNota({
  valor,
  aoMudar,
  rotulo = "Nota",
  tamanho = 36,
  idDescricao,
}: Props) {
  const arrastou = useRef(false);

  function aoClicar(evento: MouseEvent<HTMLDivElement>) {
    if (arrastou.current) {
      arrastou.current = false;
      return;
    }
    const novo = valorNaPosicao(evento.currentTarget, evento.clientX);
    aoMudar(novo === valor ? null : novo);
  }

  function aoArrastar(evento: PointerEvent<HTMLDivElement>) {
    if (evento.buttons !== 1) return;
    arrastou.current = true;
    const novo = valorNaPosicao(evento.currentTarget, evento.clientX);
    if (novo !== valor) aoMudar(novo);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const novo = valorPelaTecla(evento.key, valor);
    if (novo === undefined) return;
    evento.preventDefault();
    aoMudar(novo);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={valor ?? undefined}
      aria-valuetext={valor === null ? "Sem nota" : `${formatarNota(valor)} de 5 estrelas`}
      aria-describedby={idDescricao}
      onClick={aoClicar}
      onPointerMove={aoArrastar}
      onKeyDown={aoTeclar}
      className={`inline-flex w-fit cursor-pointer touch-none rounded-md select-none ${classeFoco}`}
    >
      {preenchimentos(valor ?? 0).map((preenchimento, indice) => (
        <Estrela key={indice} preenchimento={preenchimento} tamanho={tamanho} />
      ))}
    </div>
  );
}
