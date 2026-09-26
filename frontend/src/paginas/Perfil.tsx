import { useQuery } from "@tanstack/react-query";
import { MapPin, Settings } from "lucide-react";
import { Tabs } from "radix-ui";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api/cliente";
import { codigoDeErro, dados, mensagemDeErro } from "../api/erros";
import type { Registro } from "../api/tipos";
import { Avatar } from "../componentes/Avatar";
import { Aviso } from "../componentes/Aviso";
import { classeFoco } from "../componentes/Botao";
import { CartaoRegistro } from "../componentes/CartaoRegistro";
import { Carregando } from "../componentes/Carregando";
import { Paginacao } from "../componentes/Paginacao";
import { useSessao } from "../sessao/contexto";
import { mesDoAno } from "../util/datas";
import { useTitulo } from "../util/titulo";
import { NaoEncontrada } from "./NaoEncontrada";

/** Agrupa registros (já em ordem decrescente de data) por "setembro de 2026". */
function porMes(registros: Registro[]): [string, Registro[]][] {
  const grupos = new Map<string, Registro[]>();
  for (const item of registros) {
    const mes = mesDoAno(item.data_visita);
    grupos.set(mes, [...(grupos.get(mes) ?? []), item]);
  }
  return [...grupos];
}

function Diario({ username, ehVoce }: { username: string; ehVoce: boolean }) {
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ["diario", username, pagina],
    queryFn: () =>
      dados(
        api.GET("/api/v1/usuarios/{username}/diario", {
          params: { path: { username }, query: { page: pagina } },
        }),
      ),
  });

  if (consulta.isPending) return <Carregando />;
  if (consulta.isError) return <Aviso>{mensagemDeErro(consulta.error)}</Aviso>;
  if (consulta.data.results.length === 0) {
    return (
      <p className="py-10 text-center text-texto-secundario">
        {ehVoce
          ? "Você ainda não registrou visitas. Busque um restaurante e registre a primeira."
          : "Nenhuma visita registrada ainda."}
      </p>
    );
  }
  return (
    <>
      {porMes(consulta.data.results).map(([mes, registros]) => {
        const idTitulo = `mes-${mes.replace(/\s+/g, "-")}`;
        return (
          <section key={mes} aria-labelledby={idTitulo} className="mt-6 first:mt-2">
            <h3
              id={idTitulo}
              className="text-sm font-semibold text-texto-secundario first-letter:uppercase"
            >
              {mes}
            </h3>
            <div className="divide-y divide-borda">
              {registros.map((item) => (
                <CartaoRegistro key={item.id} registro={item} mostrar="restaurante" />
              ))}
            </div>
          </section>
        );
      })}
      <Paginacao
        pagina={pagina}
        temAnterior={consulta.data.previous !== null}
        temProxima={consulta.data.next !== null}
        aoMudar={setPagina}
      />
    </>
  );
}

function Criticas({ username }: { username: string }) {
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ["criticas", username, pagina],
    queryFn: () =>
      dados(
        api.GET("/api/v1/usuarios/{username}/criticas", {
          params: { path: { username }, query: { page: pagina } },
        }),
      ),
  });

  if (consulta.isPending) return <Carregando />;
  if (consulta.isError) return <Aviso>{mensagemDeErro(consulta.error)}</Aviso>;
  if (consulta.data.results.length === 0) {
    return <p className="py-10 text-center text-texto-secundario">Nenhuma crítica ainda.</p>;
  }
  return (
    <>
      <div className="divide-y divide-borda">
        {consulta.data.results.map((item) => (
          <CartaoRegistro key={item.id} registro={item} mostrar="restaurante" />
        ))}
      </div>
      <Paginacao
        pagina={pagina}
        temAnterior={consulta.data.previous !== null}
        temProxima={consulta.data.next !== null}
        aoMudar={setPagina}
      />
    </>
  );
}

const classeAba = `-mb-px border-b-2 border-transparent px-1 pb-2.5 text-sm font-semibold text-texto-secundario transition-colors hover:text-texto data-[state=active]:border-destaque data-[state=active]:text-texto ${classeFoco}`;

export function Perfil() {
  const { username = "" } = useParams();
  const { usuario } = useSessao();
  const perfil = useQuery({
    queryKey: ["perfil", username],
    queryFn: () =>
      dados(api.GET("/api/v1/usuarios/{username}", { params: { path: { username } } })),
  });
  const nome = perfil.data ? perfil.data.nome_exibicao || perfil.data.username : "Perfil";
  useTitulo(nome);

  if (perfil.isPending) return <Carregando />;
  if (perfil.isError) {
    if (codigoDeErro(perfil.error) === "nao_encontrado") return <NaoEncontrada />;
    return <Aviso>{mensagemDeErro(perfil.error)}</Aviso>;
  }

  const dadosPerfil = perfil.data;
  const { visitados, visitados_este_ano: esteAno } = dadosPerfil.numeros;
  const ehVoce = usuario?.username === dadosPerfil.username;

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar usuario={dadosPerfil} tamanho={80} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{nome}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-texto-secundario">
            <span>@{dadosPerfil.username}</span>
            {dadosPerfil.cidade && (
              <span className="flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {dadosPerfil.cidade.nome}
              </span>
            )}
          </p>
          {dadosPerfil.bio && <p className="mt-2 max-w-prose">{dadosPerfil.bio}</p>}
          <p className="mt-3 flex gap-5 text-sm">
            <span>
              <strong className="font-bold tabular-nums">{visitados}</strong>{" "}
              <span className="text-texto-secundario">
                {visitados === 1 ? "restaurante visitado" : "restaurantes visitados"}
              </span>
            </span>
            <span>
              <strong className="font-bold tabular-nums">{esteAno}</strong>{" "}
              <span className="text-texto-secundario">este ano</span>
            </span>
          </p>
        </div>
        {/* No celular o topo esconde "Configurações"; este é o caminho até lá */}
        {ehVoce && (
          <Link
            to="/configuracoes"
            aria-label="Editar perfil e configurações"
            className={`inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-borda bg-superficie px-4 text-sm font-semibold hover:bg-fundo sm:ml-auto sm:self-center ${classeFoco}`}
          >
            <Settings aria-hidden="true" className="size-4" />
            Editar perfil
          </Link>
        )}
      </header>

      <Tabs.Root defaultValue="diario" className="mt-10">
        <Tabs.List aria-label="Seções do perfil" className="flex gap-6 border-b border-borda">
          <Tabs.Trigger value="diario" className={classeAba}>
            Diário
          </Tabs.Trigger>
          <Tabs.Trigger value="criticas" className={classeAba}>
            Críticas
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="diario" className="focus-visible:outline-none">
          <Diario username={dadosPerfil.username} ehVoce={ehVoce} />
        </Tabs.Content>
        <Tabs.Content value="criticas" className="pt-2 focus-visible:outline-none">
          <Criticas username={dadosPerfil.username} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
