import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import type { Desejo } from "../api/tipos";
import { Aviso } from "../componentes/Aviso";
import { classeEntrada } from "../componentes/Campo";
import { CartaoRestaurante } from "../componentes/CartaoRestaurante";
import { Carregando } from "../componentes/Carregando";
import { Paginacao } from "../componentes/Paginacao";

type Ordem = "recentes" | "bairro";

const SEM_BAIRRO = "Sem bairro";

/** Agrupa os desejos (já ordenados por bairro pela API) mantendo a ordem de chegada. */
function porBairro(desejos: Desejo[]): [string, Desejo[]][] {
  const grupos = new Map<string, Desejo[]>();
  for (const item of desejos) {
    const bairro = item.restaurante.bairro || SEM_BAIRRO;
    grupos.set(bairro, [...(grupos.get(bairro) ?? []), item]);
  }
  return [...grupos];
}

function Itens({ desejos }: { desejos: Desejo[] }) {
  return (
    <div className="divide-y divide-borda">
      {desejos.map((item) => (
        <CartaoRestaurante key={item.restaurante.slug} restaurante={item.restaurante} />
      ))}
    </div>
  );
}

export function Desejos({ username, ehVoce }: { username: string; ehVoce: boolean }) {
  const idOrdem = useId();
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ["desejos", username, ordem, pagina],
    queryFn: () =>
      dados(
        api.GET("/api/v1/usuarios/{username}/desejos", {
          params: { path: { username }, query: { ordem, page: pagina } },
        }),
      ),
  });

  if (consulta.isSuccess && consulta.data.results.length === 0) {
    return (
      <p className="py-10 text-center text-texto-secundario">
        {ehVoce
          ? "Você ainda não guardou restaurantes. Toque em Desejo na página de um restaurante."
          : "Nenhum desejo ainda."}
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-end gap-2">
        <label htmlFor={idOrdem} className="text-sm text-texto-secundario">
          Ordenar
        </label>
        <select
          id={idOrdem}
          value={ordem}
          onChange={(evento) => {
            setOrdem(evento.target.value as Ordem);
            setPagina(1);
          }}
          className={`${classeEntrada} max-w-44 py-1.5 text-sm`}
        >
          <option value="recentes">Mais recentes</option>
          <option value="bairro">Por bairro</option>
        </select>
      </div>
      {consulta.isPending ? (
        <Carregando />
      ) : consulta.isError ? (
        <div className="mt-4">
          <Aviso>{mensagemDeErro(consulta.error)}</Aviso>
        </div>
      ) : ordem === "bairro" ? (
        porBairro(consulta.data.results).map(([bairro, itens]) => (
          <section key={bairro} aria-label={bairro} className="mt-6 first:mt-2">
            <h3 className="text-sm font-semibold text-texto-secundario">{bairro}</h3>
            <Itens desejos={itens} />
          </section>
        ))
      ) : (
        <div className="mt-2">
          <Itens desejos={consulta.data.results} />
        </div>
      )}
      {consulta.isSuccess && (
        <Paginacao
          pagina={pagina}
          temAnterior={consulta.data.previous !== null}
          temProxima={consulta.data.next !== null}
          aoMudar={setPagina}
        />
      )}
    </>
  );
}
