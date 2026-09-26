import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useRef } from "react";
import { Link, useLocation } from "react-router";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import type { RestauranteDetalhe } from "../api/tipos";
import { Aviso } from "../componentes/Aviso";
import { Botao, classeFoco } from "../componentes/Botao";
import { useSessao } from "../sessao/contexto";

function IconeDesejo({ ativo }: { ativo: boolean }) {
  return (
    <Heart aria-hidden="true" className={`size-4 ${ativo ? "fill-destaque text-destaque" : ""}`} />
  );
}

/** Liga e desliga o restaurante nos desejos; sem login, leva para "Entrar" e volta. */
export function BotaoDesejo({ restaurante }: { restaurante: RestauranteDetalhe }) {
  const { usuario } = useSessao();
  const { pathname } = useLocation();
  const clienteConsultas = useQueryClient();
  const enviando = useRef(false);
  const ativo = restaurante.na_minha_lista_de_desejos;
  const caminho = { params: { path: { slug: restaurante.slug } } };

  const alternar = useMutation({
    mutationFn: () =>
      dados(
        ativo
          ? api.DELETE("/api/v1/eu/desejos/{slug}", caminho)
          : api.PUT("/api/v1/eu/desejos/{slug}", caminho),
      ),
    onSuccess: () =>
      Promise.all([
        clienteConsultas.invalidateQueries({ queryKey: ["restaurante", restaurante.slug] }),
        clienteConsultas.invalidateQueries({ queryKey: ["desejos"] }),
      ]),
    onSettled: () => {
      enviando.current = false;
    },
  });

  if (!usuario) {
    return (
      <Link
        to={`/entrar?voltar=${encodeURIComponent(pathname)}`}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-borda bg-superficie px-4 text-sm font-semibold text-texto hover:bg-fundo ${classeFoco}`}
      >
        <IconeDesejo ativo={false} />
        Desejo
      </Link>
    );
  }

  function aoClicar() {
    if (enviando.current) return; // clique duplo: só o primeiro vale
    enviando.current = true;
    alternar.mutate();
  }

  return (
    <>
      <Botao
        variante="secundaria"
        aria-pressed={ativo}
        disabled={alternar.isPending}
        onClick={aoClicar}
      >
        <IconeDesejo ativo={ativo} />
        Desejo
      </Botao>
      {alternar.isError && (
        <div className="w-full">
          <Aviso>{mensagemDeErro(alternar.error)}</Aviso>
        </div>
      )}
    </>
  );
}
