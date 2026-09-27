import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { api } from "../api/cliente";
import { aplicarErros, dados, errosDeCampo, mensagemDeErro } from "../api/erros";
import type { components } from "../api/esquema";
import { Aviso } from "../componentes/Aviso";
import { Botao, classeFoco } from "../componentes/Botao";
import { Campo, classeEntrada } from "../componentes/Campo";
import { EstrelasNota } from "../componentes/EstrelasNota";
import { hojeLocal } from "../util/datas";
import { CampoFotos } from "./CampoFotos";

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

/** Envio das fotos depois de criado o registro: uma por vez, guardando as que falharem. */
type Falha = { foto: File; mensagem: string; podeTentar: boolean };
type Envio = {
  registroId: number;
  total: number;
  atual: number;
  falhas: Falha[];
  enviando: boolean;
};

/** Recusa do servidor (erro no campo "imagem") não passa tentando de novo; rede, 5xx e 429 podem. */
function falhaDoEnvio(foto: File, erro: unknown): Falha {
  const doCampo = errosDeCampo(erro).imagem;
  return doCampo
    ? { foto, mensagem: doCampo, podeTentar: false }
    : { foto, mensagem: mensagemDeErro(erro), podeTentar: true };
}

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
  const [fotos, setFotos] = useState<File[]>([]);
  const [envio, setEnvio] = useState<Envio | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: valoresIniciais() });

  const salvar = useMutation({
    mutationFn: (corpo: Dados & { nota: number | null }) =>
      dados(
        api.POST("/api/v1/registros", {
          body: { restaurante_slug: restaurante.slug, ...corpo, critica: corpo.critica.trim() },
        }),
      ),
    onSuccess: (registro) => {
      invalidar();
      if (fotos.length === 0) fechar();
      else void enviarFotos(registro.id, fotos);
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

  function invalidar() {
    void clienteConsultas.invalidateQueries({ queryKey: ["restaurante", restaurante.slug] });
    void clienteConsultas.invalidateQueries({ queryKey: ["diario"] });
    void clienteConsultas.invalidateQueries({ queryKey: ["criticas"] });
    void clienteConsultas.invalidateQueries({ queryKey: ["perfil"] });
    // O registro tira o restaurante dos desejos (no backend)
    void clienteConsultas.invalidateQueries({ queryKey: ["desejos"] });
  }

  async function enviarFotos(registroId: number, lista: File[]) {
    const falhas: Falha[] = [];
    for (const [indice, foto] of lista.entries()) {
      setEnvio({ registroId, total: lista.length, atual: indice + 1, falhas: [], enviando: true });
      const formulario = new FormData();
      formulario.append("imagem", foto);
      try {
        await dados(
          api.POST("/api/v1/registros/{id}/fotos", {
            params: { path: { id: registroId } },
            body: formulario as unknown as components["schemas"]["EnvioFotoRequest"],
          }),
        );
      } catch (erro) {
        falhas.push(falhaDoEnvio(foto, erro));
      }
    }
    invalidar();
    if (falhas.length === 0) fechar();
    else
      setEnvio({ registroId, total: lista.length, atual: lista.length, falhas, enviando: false });
  }

  function limpar() {
    setFotos([]);
    setEnvio(null);
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

  const tamanhoCritica = useWatch({ control, name: "critica" })?.length ?? 0;

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(abrir) => {
        if (abrir) aoMudarAberto(true);
        else if (!envio?.enviando) fechar(); // durante o envio das fotos, o modal fica aberto
      }}
    >
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
            {!envio && (
              <Dialog.Close
                aria-label="Fechar"
                className={`rounded-md p-1 text-texto-secundario hover:text-texto ${classeFoco}`}
              >
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            )}
          </div>

          {envio && (
            <div className="mt-6 flex flex-col gap-4">
              {envio.enviando ? (
                <>
                  <p role="status" className="text-sm text-texto-secundario">
                    Enviando fotos… {envio.atual} de {envio.total}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-borda">
                    <div
                      className="h-full rounded-full bg-destaque transition-[width] duration-300"
                      style={{ width: `${((envio.atual - 1) / envio.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Aviso>
                    <p>
                      {envio.falhas.length === 1
                        ? "Não foi possível enviar 1 foto."
                        : `Não foi possível enviar ${envio.falhas.length} fotos.`}
                    </p>
                    {[...new Set(envio.falhas.map((falha) => falha.mensagem))].map((mensagem) => (
                      <p key={mensagem}>{mensagem}</p>
                    ))}
                    <p>A visita já está salva.</p>
                  </Aviso>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Botao variante="secundaria" onClick={fechar}>
                      Fechar
                    </Botao>
                    {envio.falhas.some((falha) => falha.podeTentar) && (
                      <Botao
                        onClick={() =>
                          void enviarFotos(
                            envio.registroId,
                            envio.falhas
                              .filter((falha) => falha.podeTentar)
                              .map((falha) => falha.foto),
                          )
                        }
                      >
                        Tentar de novo
                      </Botao>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <form
            onSubmit={(evento) => void handleSubmit(enviar)(evento)}
            noValidate
            hidden={envio !== null}
            className="mt-6 flex flex-col gap-5"
          >
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

            <CampoFotos fotos={fotos} aoMudar={setFotos} desabilitado={salvar.isPending} />

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
