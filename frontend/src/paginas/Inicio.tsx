import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Botao, classeFoco } from "../componentes/Botao";
import { classeEntrada } from "../componentes/Campo";
import { FeedComunidade } from "../feed/FeedComunidade";
import { useSessao } from "../sessao/contexto";
import { useTitulo } from "../util/titulo";

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

      {!usuario && <Apresentacao />}
      <FeedComunidade />
    </div>
  );
}
