import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type KeyboardEvent } from "react";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import type { Registro } from "../api/tipos";
import { Aviso } from "../componentes/Aviso";
import { Botao, classeFoco } from "../componentes/Botao";
import { useSessao } from "../sessao/contexto";

type Props = {
  registro: Registro;
  inicial: number;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
};

const classeBotaoEscuro = `inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 ${classeFoco}`;

/** Fotos de um registro em tela cheia; o dono pode apagar a foto que está vendo. */
export function TelaCheiaFotos({ registro, inicial, aberto, aoMudarAberto }: Props) {
  const { usuario } = useSessao();
  const clienteConsultas = useQueryClient();
  const [indice, setIndice] = useState(inicial);
  // Id da foto em confirmação: fixado ao abrir, para as setas não trocarem a foto a apagar
  const [paraApagar, setParaApagar] = useState<number | null>(null);
  const confirmando = paraApagar !== null;
  const { fotos, restaurante } = registro;
  const total = fotos.length;
  const atual = fotos[Math.min(indice, total - 1)];
  const autor = registro.usuario.nome_exibicao || registro.usuario.username;
  const ehDono = usuario?.username === registro.usuario.username;

  const apagar = useMutation({
    mutationFn: () =>
      dados(
        api.DELETE("/api/v1/registros/{id}/fotos/{foto_id}", {
          params: { path: { id: registro.id, foto_id: paraApagar ?? atual.id } },
        }),
      ),
    onSuccess: () => {
      for (const chave of ["diario", "criticas", "restaurante", "perfil"]) {
        void clienteConsultas.invalidateQueries({ queryKey: [chave] });
      }
      setParaApagar(null);
      aoMudarAberto(false);
    },
  });

  function aoTeclar(evento: KeyboardEvent) {
    if (confirmando) return; // com a confirmação aberta, a foto não muda
    if (evento.key === "ArrowLeft") setIndice((i) => Math.max(0, i - 1));
    if (evento.key === "ArrowRight") setIndice((i) => Math.min(total - 1, i + 1));
  }

  if (!atual) return null;

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudarAberto}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={aoTeclar}
          className="fixed inset-0 z-50 flex flex-col text-white focus-visible:outline-none"
        >
          <Dialog.Title className="sr-only">
            Fotos de {autor} em {restaurante.nome}
          </Dialog.Title>
          <div className="flex items-center justify-between gap-3 p-3">
            <p className="text-sm tabular-nums text-white/85">
              {Math.min(indice, total - 1) + 1} / {total}
            </p>
            <div className="flex items-center gap-2">
              {ehDono && (
                <button
                  type="button"
                  onClick={() => setParaApagar(atual.id)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold hover:bg-white/20 ${classeFoco}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Apagar esta foto
                </button>
              )}
              <Dialog.Close aria-label="Fechar" className={classeBotaoEscuro}>
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
            <img
              src={atual.imagem}
              alt={`Foto ${Math.min(indice, total - 1) + 1} de ${total} de ${restaurante.nome}`}
              width={atual.largura}
              height={atual.altura}
              className="max-h-full max-w-full object-contain"
            />
            {total > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  disabled={indice === 0}
                  onClick={() => setIndice((i) => Math.max(0, i - 1))}
                  className={`absolute left-3 ${classeBotaoEscuro}`}
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima foto"
                  disabled={indice >= total - 1}
                  onClick={() => setIndice((i) => Math.min(total - 1, i + 1))}
                  className={`absolute right-3 ${classeBotaoEscuro}`}
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                </button>
              </>
            )}
          </div>

          <Dialog.Root
            open={confirmando}
            onOpenChange={(abrir) => {
              if (!abrir) setParaApagar(null);
              apagar.reset();
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-borda bg-superficie p-6 text-texto shadow-[0_8px_32px_rgb(0_0_0/0.3)]">
                <Dialog.Title className="text-lg font-bold">Apagar esta foto?</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-texto-secundario">
                  A foto sai da sua visita e não dá para desfazer.
                </Dialog.Description>
                {apagar.isError && (
                  <div className="mt-4">
                    <Aviso>{mensagemDeErro(apagar.error)}</Aviso>
                  </div>
                )}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Dialog.Close asChild>
                    <Botao variante="secundaria">Cancelar</Botao>
                  </Dialog.Close>
                  <Botao
                    variante="perigo"
                    disabled={apagar.isPending}
                    onClick={() => apagar.mutate()}
                  >
                    {apagar.isPending ? "Apagando…" : "Apagar"}
                  </Botao>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
