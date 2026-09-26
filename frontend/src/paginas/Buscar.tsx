import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import type { paths } from "../api/esquema";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { classeEntrada } from "../componentes/Campo";
import { CartaoRestaurante } from "../componentes/CartaoRestaurante";
import { Carregando } from "../componentes/Carregando";
import { Paginacao } from "../componentes/Paginacao";
import { CIDADE_PADRAO } from "../util/cidade";
import { useTitulo } from "../util/titulo";

type Consulta = NonNullable<paths["/api/v1/restaurantes"]["get"]["parameters"]["query"]>;

const ORDENS: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Relevância" },
  { valor: "nota", rotulo: "Mais bem avaliados" },
  { valor: "populares", rotulo: "Mais avaliados" },
  { valor: "nome", rotulo: "A–Z" },
];

function consultaDaUrl(parametros: URLSearchParams): Consulta {
  const texto = (chave: string) => parametros.get(chave) || undefined;
  const numero = (chave: string) =>
    parametros.get(chave) ? Number(parametros.get(chave)) : undefined;
  return {
    cidade: CIDADE_PADRAO,
    q: texto("q"),
    bairro: texto("bairro"),
    categoria: texto("categoria"),
    preco: numero("preco"),
    nota_min: texto("nota_min"),
    ordem: texto("ordem") as Consulta["ordem"],
    page: numero("page"),
  };
}

function Filtro({
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: { valor: string; rotulo: string }[];
}) {
  const id = useId();
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-texto-secundario">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className={`${classeEntrada} py-1.5 text-sm`}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Buscar() {
  useTitulo("Buscar");
  const [parametros, setParametros] = useSearchParams();
  const consulta = consultaDaUrl(parametros);
  const pagina = consulta.page ?? 1;
  const [termo, setTermo] = useState(parametros.get("q") ?? "");

  const resultado = useQuery({
    queryKey: ["restaurantes", consulta],
    queryFn: () => dados(api.GET("/api/v1/restaurantes", { params: { query: consulta } })),
    placeholderData: keepPreviousData,
  });
  const bairros = useQuery({
    queryKey: ["bairros", CIDADE_PADRAO],
    queryFn: () =>
      dados(api.GET("/api/v1/bairros", { params: { query: { cidade: CIDADE_PADRAO } } })),
    staleTime: Infinity,
  });
  const categorias = useQuery({
    queryKey: ["categorias"],
    queryFn: () => dados(api.GET("/api/v1/categorias")),
    staleTime: Infinity,
  });

  /** Muda um parâmetro da URL; qualquer filtro novo volta para a página 1. */
  function alterar(chave: string, valor: string) {
    setParametros((atuais) => {
      const novos = new URLSearchParams(atuais);
      if (valor) novos.set(chave, valor);
      else novos.delete(chave);
      if (chave !== "page") novos.delete("page");
      return novos;
    });
  }

  function aoBuscar(evento: FormEvent) {
    evento.preventDefault();
    alterar("q", termo.trim());
  }

  const total = resultado.data?.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Buscar</h1>

      <form role="search" onSubmit={aoBuscar} className="mt-5 flex gap-2">
        <label htmlFor="termo-busca" className="sr-only">
          Buscar restaurante
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-secundario"
          />
          <input
            id="termo-busca"
            type="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Nome do restaurante"
            maxLength={100}
            className={`${classeEntrada} pl-9`}
          />
        </div>
        <Botao type="submit">Buscar</Botao>
      </form>

      <div className="mt-4 flex flex-wrap gap-3">
        <Filtro
          rotulo="Bairro"
          valor={parametros.get("bairro") ?? ""}
          aoMudar={(valor) => alterar("bairro", valor)}
          opcoes={[
            { valor: "", rotulo: "Todos" },
            ...(bairros.data ?? []).map((bairro) => ({ valor: bairro, rotulo: bairro })),
          ]}
        />
        <Filtro
          rotulo="Categoria"
          valor={parametros.get("categoria") ?? ""}
          aoMudar={(valor) => alterar("categoria", valor)}
          opcoes={[
            { valor: "", rotulo: "Todas" },
            ...(categorias.data ?? []).map((c) => ({ valor: c.slug, rotulo: c.nome })),
          ]}
        />
        <Filtro
          rotulo="Preço"
          valor={parametros.get("preco") ?? ""}
          aoMudar={(valor) => alterar("preco", valor)}
          opcoes={[
            { valor: "", rotulo: "Qualquer" },
            ...[1, 2, 3, 4].map((n) => ({ valor: String(n), rotulo: "$".repeat(n) })),
          ]}
        />
        <Filtro
          rotulo="Nota mínima"
          valor={parametros.get("nota_min") ?? ""}
          aoMudar={(valor) => alterar("nota_min", valor)}
          opcoes={[
            { valor: "", rotulo: "Qualquer" },
            ...[1, 2, 3, 4, 5].map((n) => ({ valor: String(n), rotulo: `${n}+ estrelas` })),
          ]}
        />
        <Filtro
          rotulo="Ordenar por"
          valor={parametros.get("ordem") ?? ""}
          aoMudar={(valor) => alterar("ordem", valor)}
          opcoes={ORDENS}
        />
      </div>

      <section aria-labelledby="titulo-resultados" className="mt-8">
        <h2 id="titulo-resultados" className="sr-only">
          Resultados
        </h2>
        {resultado.isPending ? (
          <Carregando />
        ) : resultado.isError ? (
          <Aviso>{mensagemDeErro(resultado.error)}</Aviso>
        ) : total === 0 ? (
          <p className="py-12 text-center text-texto-secundario">
            Nenhum restaurante encontrado. Tente outro termo ou tire filtros.
          </p>
        ) : (
          <>
            <p className="mb-2 px-3 text-sm text-texto-secundario tabular-nums" aria-live="polite">
              {total.toLocaleString("pt-BR")} {total === 1 ? "restaurante" : "restaurantes"}
            </p>
            <ul
              className={`divide-y divide-borda transition-opacity ${resultado.isPlaceholderData ? "opacity-60" : ""}`}
            >
              {resultado.data.results.map((restaurante) => (
                <li key={restaurante.slug}>
                  <CartaoRestaurante restaurante={restaurante} />
                </li>
              ))}
            </ul>
            <Paginacao
              pagina={pagina}
              temAnterior={resultado.data.previous !== null}
              temProxima={resultado.data.next !== null}
              aoMudar={(nova) => alterar("page", nova > 1 ? String(nova) : "")}
            />
          </>
        )}
      </section>
    </div>
  );
}
