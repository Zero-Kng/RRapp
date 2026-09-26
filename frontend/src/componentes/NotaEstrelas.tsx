import { formatarNota, preenchimentos, type Preenchimento } from "../util/notas";

const CAMINHO =
  "M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.46l-5.8 3.04 1.1-6.47-4.7-4.58 6.5-.95L12 2.6z";

/** Uma estrela; a metade preenchida é um recorte da estrela cheia por cima da vazia. */
export function Estrela({
  preenchimento,
  tamanho,
}: {
  preenchimento: Preenchimento;
  tamanho: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        viewBox="0 0 24 24"
        width={tamanho}
        height={tamanho}
        className="absolute inset-0 text-texto-secundario/55"
      >
        <path d={CAMINHO} fill="currentColor" />
      </svg>
      {preenchimento > 0 && (
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${preenchimento * 100}%` }}
        >
          <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} className="text-estrela">
            <path d={CAMINHO} fill="currentColor" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Nota só para leitura. */
export function NotaEstrelas({ valor, tamanho = 16 }: { valor: number; tamanho?: number }) {
  return (
    <span role="img" aria-label={`${formatarNota(valor)} de 5 estrelas`} className="inline-flex">
      {preenchimentos(valor).map((preenchimento, indice) => (
        <Estrela key={indice} preenchimento={preenchimento} tamanho={tamanho} />
      ))}
    </span>
  );
}
