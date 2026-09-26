import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao, classeFoco } from "../componentes/Botao";
import { classeEntrada } from "../componentes/Campo";
import { Carregando } from "../componentes/Carregando";
import { CartaoRegistro } from "../componentes/CartaoRegistro";
import { useSessao } from "../sessao/contexto";
import { useTitulo } from "../util/titulo";

const VISITAS_NA_INICIAL = 5;

function UltimasVisitas({ username }: { username: string }) {
  // A mesma chave da 1ª página do diário no perfil: um cache serve às duas telas
  const consulta = useQuery({
    queryKey: ["diario", username, 1],
    queryFn: () =>
      dados(
        api.GET("/api/v1/usuarios/{username}/diario", {
          params: { path: { username }, query: { page: 1 } },
        }),
      ),
  });

  return (
    <section aria-labelledby="titulo-ultimas" className="mt-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="titulo-ultimas" className="text-lg font-bold">
          Suas últimas visitas
        </h2>
        {consulta.data && consulta.data.results.length > 0 && (
          <Link
            to={`/u/${username}`}
            className={`rounded-md text-sm font-semibold text-destaque hover:underline ${classeFoco}`}
          >
            Ver diário completo
          </Link>
        )}
      </div>
      {consulta.isPending ? (
        <Carregando />
      ) : consulta.isError ? (
        <div className="mt-4">
          <Aviso>{mensagemDeErro(consulta.error)}</Aviso>
        </div>
      ) : consulta.data.results.length === 0 ? (
        <p className="py-10 text-center text-texto-secundario">
          Você ainda não registrou visitas. Busque um restaurante e registre a primeira.
        </p>
      ) : (
        <div className="mt-2 divide-y divide-borda">
          {consulta.data.results.slice(0, VISITAS_NA_INICIAL).map((item) => (
            <CartaoRegistro key={item.id} registro={item} mostrar="restaurante" />
          ))}
        </div>
      )}
    </section>
  );
}

function Apresentacao() {
  return (
    <section aria-labelledby="titulo-apresentacao" className="mt-12 max-w-xl">
      <h2 id="titulo-apresentacao" className="text-lg font-bold">
        Seu diário de restaurantes
      </h2>
      <p className="mt-2 text-texto-secundario">
        Registre cada visita com nota e comentário, lembre do que pediu e veja o que as outras
        pessoas acharam antes de escolher o próximo lugar.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to="/cadastro"
          className={`inline-flex min-h-10 items-center rounded-lg bg-destaque px-4 text-sm font-semibold text-sobre-destaque hover:brightness-110 ${classeFoco}`}
        >
          Criar conta
        </Link>
        <Link
          to="/entrar"
          className={`rounded-md text-sm font-semibold text-texto-secundario hover:text-texto ${classeFoco}`}
        >
          Já tenho conta
        </Link>
      </div>
    </section>
  );
}

export function Inicio() {
  useTitulo("Início");
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const [termo, setTermo] = useState("");

  function aoBuscar(evento: FormEvent) {
    evento.preventDefault();
    const busca = termo.trim();
    navegar(busca ? `/buscar?${new URLSearchParams({ q: busca })}` : "/buscar");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Onde você comeu hoje?
      </h1>

      <form role="search" onSubmit={aoBuscar} className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="busca-inicio" className="sr-only">
          Buscar restaurante
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-secundario"
          />
          <input
            id="busca-inicio"
            type="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Aprazível, Adega Pérola…"
            maxLength={100}
            className={`${classeEntrada} pl-9`}
          />
        </div>
        <Botao type="submit">Buscar</Botao>
      </form>

      {usuario ? <UltimasVisitas username={usuario.username} /> : <Apresentacao />}
    </div>
  );
}
