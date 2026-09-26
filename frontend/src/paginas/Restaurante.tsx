import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";
import { api } from "../api/cliente";
import { codigoDeErro, dados, mensagemDeErro } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { CartaoRegistro } from "../componentes/CartaoRegistro";
import { Carregando } from "../componentes/Carregando";
import { Histograma } from "../componentes/Histograma";
import { NotaEstrelas } from "../componentes/NotaEstrelas";
import { useSessao } from "../sessao/contexto";
import { formatarData } from "../util/datas";
import { formatarNota } from "../util/notas";
import { useTitulo } from "../util/titulo";
import { NaoEncontrada } from "./NaoEncontrada";

export function Restaurante() {
  const { slug = "" } = useParams();
  const { pathname } = useLocation();
  const { usuario } = useSessao();

  const detalhe = useQuery({
    queryKey: ["restaurante", slug],
    queryFn: () => dados(api.GET("/api/v1/restaurantes/{slug}", { params: { path: { slug } } })),
  });
  const criticas = useQuery({
    queryKey: ["restaurante", slug, "registros"],
    queryFn: () =>
      dados(api.GET("/api/v1/restaurantes/{slug}/registros", { params: { path: { slug } } })),
  });
  useTitulo(detalhe.data?.nome ?? "Restaurante");

  if (detalhe.isPending) return <Carregando />;
  if (detalhe.isError) {
    if (codigoDeErro(detalhe.error) === "nao_encontrado") return <NaoEncontrada />;
    return <Aviso>{mensagemDeErro(detalhe.error)}</Aviso>;
  }

  const restaurante = detalhe.data;
  const detalhes = [
    restaurante.bairro,
    ...restaurante.categorias.map((categoria) => categoria.nome),
    restaurante.faixa_preco ? "$".repeat(restaurante.faixa_preco) : null,
  ].filter(Boolean);
  const meu = restaurante.meu_ultimo_registro;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {restaurante.nome}
          </h1>
          {restaurante.status === "fechado" && (
            <span className="rounded-md border border-borda px-2 py-0.5 text-sm font-medium text-texto-secundario">
              Fechado
            </span>
          )}
        </div>
        <p className="mt-2 text-texto-secundario">{detalhes.join(" · ")}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {restaurante.endereco && (
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4 text-texto-secundario" />
              {restaurante.endereco}
            </span>
          )}
          <a
            href={restaurante.link_mapa}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium text-destaque hover:underline"
          >
            Ver no mapa
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </p>
      </header>

      <section
        aria-label="Avaliações"
        className="flex flex-col gap-6 border-y border-borda py-6 sm:flex-row sm:items-center sm:justify-between"
      >
        {restaurante.nota_media === null ? (
          <p className="text-texto-secundario">Ainda sem avaliações.</p>
        ) : (
          <div className="flex items-center gap-5">
            <p className="text-5xl font-bold tracking-tight tabular-nums">
              {formatarNota(restaurante.nota_media)}
            </p>
            <div className="flex flex-col gap-1">
              <NotaEstrelas valor={restaurante.nota_media} tamanho={20} />
              <p className="text-sm text-texto-secundario tabular-nums">
                {restaurante.total_avaliacoes}{" "}
                {restaurante.total_avaliacoes === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>
          </div>
        )}
        {restaurante.total_avaliacoes > 0 && <Histograma barras={restaurante.histograma} />}
      </section>

      <section aria-label="Sua visita" className="flex flex-wrap items-center gap-4">
        {usuario ? (
          <Botao>Registrar visita</Botao>
        ) : (
          <Link
            to={`/entrar?voltar=${encodeURIComponent(pathname)}`}
            className="inline-flex min-h-10 items-center rounded-lg bg-destaque px-4 text-sm font-semibold text-sobre-destaque hover:brightness-110"
          >
            Entre para registrar sua visita
          </Link>
        )}
        {meu && (
          <p className="flex items-center gap-2 text-sm text-texto-secundario">
            Sua última visita: {formatarData(meu.data_visita)}
            {meu.nota !== null && <NotaEstrelas valor={meu.nota} tamanho={14} />}
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-criticas">
        <h2 id="titulo-criticas" className="text-lg font-bold">
          Críticas
        </h2>
        {criticas.isPending ? (
          <Carregando />
        ) : criticas.isError ? (
          <Aviso>{mensagemDeErro(criticas.error)}</Aviso>
        ) : criticas.data.results.length === 0 ? (
          <p className="mt-3 text-texto-secundario">
            Ninguém escreveu sobre este lugar ainda. Registre sua visita e conte como foi.
          </p>
        ) : (
          <div className="divide-y divide-borda">
            {criticas.data.results.map((registro) => (
              <CartaoRegistro key={registro.id} registro={registro} mostrar="usuario" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
