import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../api/cliente";
import { aplicarErros, dados, errosDeCampo } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao, classeFoco } from "../componentes/Botao";
import { Campo, classeEntrada } from "../componentes/Campo";
import { EstrelasNota } from "../componentes/EstrelasNota";
import { hojeLocal } from "../util/datas";

const LIMITE_CRITICA = 5000;

const esquema = z.object({
  data_visita: z
    .string()
    .min(1, "Informe a data.")
    .refine((data) => data <= hojeLocal(), "A data não pode estar no futuro."),
  critica: z.string().max(LIMITE_CRITICA, "A crítica pode ter até 5.000 caracteres."),
  curtiu: z.boolean(),
  revisita: z.boolean(),
});
type Dados = z.infer<typeof esquema>;

type Props = {
  restaurante: { slug: string; nome: string };
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
};

const valoresIniciais = (): Dados => ({
  data_visita: hojeLocal(),
  critica: "",
  curtiu: false,
  revisita: false,
});

export function RegistrarVisita({ restaurante, aberto, aoMudarAberto }: Props) {
  const clienteConsultas = useQueryClient();
  const idCritica = useId();
  const idErroNota = useId();
  const enviando = useRef(false);
  const [nota, setNota] = useState<number | null>(null);
  const [erroNota, setErroNota] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: valoresIniciais() });

  const salvar = useMutation({
    mutationFn: (corpo: Dados & { nota: number | null }) =>
      dados(
        api.POST("/api/v1/registros", {
          body: { restaurante_slug: restaurante.slug, ...corpo, critica: corpo.critica.trim() },
        }),
      ),
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ["restaurante", restaurante.slug] });
      void clienteConsultas.invalidateQueries({ queryKey: ["diario"] });
      void clienteConsultas.invalidateQueries({ queryKey: ["criticas"] });
      void clienteConsultas.invalidateQueries({ queryKey: ["perfil"] });
      fechar();
    },
    onError: (erro) => {
      setErroNota(errosDeCampo(erro).nota ?? null);
      const geral = aplicarErros(erro, setError, ["data_visita", "critica"] as const);
      setErroGeral(errosDeCampo(erro).nota ? null : geral);
    },
    onSettled: () => {
      enviando.current = false;
    },
  });

  function limpar() {
    reset(valoresIniciais());
    setNota(null);
    setErroNota(null);
    setErroGeral(null);
  }

  function fechar() {
    limpar();
    aoMudarAberto(false);
  }

  function enviar(valores: Dados) {
    if (enviando.current) return; // clique duplo: só o primeiro envio vale
    enviando.current = true;
    setErroGeral(null);
    setErroNota(null);
    salvar.mutate({ ...valores, nota });
  }

  const tamanhoCritica = watch("critica")?.length ?? 0;

  return (
    <Dialog.Root open={aberto} onOpenChange={(abrir) => (abrir ? aoMudarAberto(true) : fechar())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-borda bg-superficie p-5 shadow-[0_-8px_32px_rgb(0_0_0/0.18)] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold tracking-tight">
                Registrar visita
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-texto-secundario">
                {restaurante.nome}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className={`rounded-md p-1 text-texto-secundario hover:text-texto ${classeFoco}`}
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(enviar)} noValidate className="mt-6 flex flex-col gap-5">
            {erroGeral && <Aviso>{erroGeral}</Aviso>}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Sua nota</span>
              <EstrelasNota
                valor={nota}
                aoMudar={setNota}
                idDescricao={erroNota ? idErroNota : undefined}
              />
              {erroNota ? (
                <p id={idErroNota} className="text-sm text-erro">
                  {erroNota}
                </p>
              ) : (
                <p className="text-sm text-texto-secundario">
                  Opcional. Toque de novo na nota para limpar.
                </p>
              )}
            </div>

            <Campo
              rotulo="Data da visita"
              type="date"
              max={hojeLocal()}
              erro={errors.data_visita?.message}
              {...register("data_visita")}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor={idCritica} className="text-sm font-medium">
                  Crítica
                </label>
                <span
                  className={`text-xs tabular-nums ${tamanhoCritica > LIMITE_CRITICA ? "text-erro" : "text-texto-secundario"}`}
                >
                  {tamanhoCritica}/{LIMITE_CRITICA}
                </span>
              </div>
              <textarea
                id={idCritica}
                rows={4}
                placeholder="O que você pediu? Como foi?"
                aria-invalid={errors.critica ? true : undefined}
                aria-describedby={errors.critica ? `${idCritica}-erro` : undefined}
                className={`${classeEntrada} resize-y`}
                {...register("critica")}
              />
              {errors.critica && (
                <p id={`${idCritica}-erro`} className="text-sm text-erro">
                  {errors.critica.message}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" {...register("curtiu")} />
                Curti
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" {...register("revisita")} />
                Já tinha ido antes
              </label>
            </div>

            <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Botao variante="secundaria">Cancelar</Botao>
              </Dialog.Close>
              <Botao type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando…" : "Salvar"}
              </Botao>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
