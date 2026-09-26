import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

type Tipo = "erro" | "sucesso" | "info";

const ESTILOS: Record<Tipo, { classe: string; Icone: typeof Info }> = {
  erro: { classe: "border-erro/40 text-erro", Icone: CircleAlert },
  sucesso: { classe: "border-sucesso/40 text-sucesso", Icone: CircleCheck },
  info: { classe: "border-borda text-texto-secundario", Icone: Info },
};

export function Aviso({ tipo = "erro", children }: { tipo?: Tipo; children: ReactNode }) {
  const { classe, Icone } = ESTILOS[tipo];
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border bg-superficie px-3 py-2.5 text-sm ${classe}`}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="text-texto">{children}</div>
    </div>
  );
}
