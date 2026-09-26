import { useId, type ComponentProps } from "react";

/** Classes das caixas de texto, também usadas em `textarea` e `select`. */
export const classeEntrada =
  "w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-base text-texto placeholder:text-texto-secundario outline-none transition-[border-color,box-shadow] duration-150 focus:border-destaque focus:ring-3 focus:ring-destaque/25 aria-invalid:border-erro";

type Props = ComponentProps<"input"> & {
  rotulo: string;
  erro?: string;
  dica?: string;
};

export function Campo({ rotulo, erro, dica, id, className = "", ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idAjuda = `${idCampo}-ajuda`;
  const ajuda = erro ?? dica;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ajuda ? idAjuda : undefined}
        className={`${classeEntrada} ${className}`}
        {...props}
      />
      {ajuda && (
        <p id={idAjuda} className={`text-sm ${erro ? "text-erro" : "text-texto-secundario"}`}>
          {ajuda}
        </p>
      )}
    </div>
  );
}
