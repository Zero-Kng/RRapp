import { ChevronLeft, ChevronRight } from "lucide-react";
import { Botao } from "./Botao";

type Props = {
  pagina: number;
  temAnterior: boolean;
  temProxima: boolean;
  aoMudar: (pagina: number) => void;
};

export function Paginacao({ pagina, temAnterior, temProxima, aoMudar }: Props) {
  if (!temAnterior && !temProxima) return null;
  return (
    <nav aria-label="Paginação" className="mt-6 flex items-center justify-between gap-4">
      <Botao variante="secundaria" disabled={!temAnterior} onClick={() => aoMudar(pagina - 1)}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        Anterior
      </Botao>
      <p className="text-sm text-texto-secundario tabular-nums">Página {pagina}</p>
      <Botao variante="secundaria" disabled={!temProxima} onClick={() => aoMudar(pagina + 1)}>
        Próxima
        <ChevronRight aria-hidden="true" className="size-4" />
      </Botao>
    </nav>
  );
}
