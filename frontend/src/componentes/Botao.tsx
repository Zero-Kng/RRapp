import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  variante?: "primaria" | "secundaria" | "perigo" | "discreta";
};

const VARIANTES = {
  primaria: "bg-destaque text-sobre-destaque hover:brightness-110 active:brightness-95",
  secundaria: "border border-borda bg-superficie text-texto hover:bg-fundo",
  perigo: "bg-erro text-fundo hover:brightness-110",
  discreta: "text-texto-secundario hover:bg-fundo hover:text-texto",
};

export const classeFoco =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";

export function Botao({ variante = "primaria", className = "", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[filter,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${classeFoco} ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  );
}
