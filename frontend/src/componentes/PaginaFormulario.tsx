import type { ReactNode } from "react";
import { useTitulo } from "../util/titulo";

type Props = { titulo: string; subtitulo?: string; children: ReactNode };

/** Tela estreita e centralizada para formulários (entrar, cadastro, senha). */
export function PaginaFormulario({ titulo, subtitulo, children }: Props) {
  useTitulo(titulo);
  return (
    <div className="mx-auto w-full max-w-sm pt-4 sm:pt-10">
      <h1 className="text-2xl font-bold tracking-tight text-balance">{titulo}</h1>
      {subtitulo && <p className="mt-1.5 text-texto-secundario">{subtitulo}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
