import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Carregando } from "../componentes/Carregando";
import { ItemDoFeed } from "./ItemDoFeed";

/** O cursor da próxima página vem dentro da URL `next` que a API devolve. */
function cursorDe(proxima: string | null): string | undefined {
  return proxima ? (new URL(proxima).searchParams.get("cursor") ?? undefined) : undefined;
}

/** Feed da comunidade: as visitas mais recentes com foto ou crítica, carregando ao rolar. */
export function FeedComunidade() {
  const consulta = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) =>
      dados(api.GET("/api/v1/feed", { params: { query: { cursor: pageParam } } })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (pagina) => cursorDe(pagina.next),
  });
  const { hasNextPage, isFetching, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    consulta;
  const marcador = useRef<HTMLDivElement>(null);

  // Perto do fim, a próxima página vem sozinha; depois de um erro, só pelo botão. Nunca durante
  // uma atualização (ex.: depois de apagar uma foto): pedir a próxima página a cancelaria
  useEffect(() => {
    const elemento = marcador.current;
    if (!elemento || !hasNextPage || isFetching || isFetchNextPageError) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  const itens = consulta.data?.pages.flatMap((pagina) => pagina.results) ?? [];

  return (
    <section aria-labelledby="titulo-feed" className="mt-12 max-w-xl">
      <h2 id="titulo-feed" className="text-lg font-bold">
        Visitas da comunidade
      </h2>
      {consulta.isPending ? (
        <Carregando />
      ) : consulta.isError && itens.length === 0 ? (
        <div className="mt-4">
          <Aviso>{mensagemDeErro(consulta.error)}</Aviso>
        </div>
      ) : itens.length === 0 ? (
        <p className="py-10 text-center text-texto-secundario">
          Ainda não há visitas com foto ou crítica. Registre a sua e ela aparece aqui.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3">
            {itens.map((item, indice) => (
              <ItemDoFeed key={item.id} item={item} prioritaria={indice < 2} />
            ))}
          </div>
          {hasNextPage && (
            <div ref={marcador} className="mt-6 flex flex-col items-center gap-3">
              {isFetchNextPageError && (
                <div className="w-full">
                  <Aviso>{mensagemDeErro(consulta.error)}</Aviso>
                </div>
              )}
              <Botao
                variante="secundaria"
                disabled={isFetching}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? "Carregando…" : "Carregar mais"}
              </Botao>
            </div>
          )}
        </>
      )}
    </section>
  );
}
