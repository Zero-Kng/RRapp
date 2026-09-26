import { LoaderCircle } from "lucide-react";

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 py-12 text-sm text-texto-secundario"
    >
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      {texto}
    </p>
  );
}
