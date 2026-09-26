import { House, LogIn, Search, UserRound } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { classeFoco } from "../componentes/Botao";
import { useSessao } from "../sessao/contexto";

const classeLinkTopo = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1 transition-colors ${classeFoco} ${
    isActive ? "text-texto" : "text-texto-secundario hover:text-texto"
  }`;

const classeLinkInferior = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${classeFoco} ${
    isActive ? "text-destaque" : "text-texto-secundario"
  }`;

export function Layout() {
  const { usuario, sair } = useSessao();
  const navegar = useNavigate();

  async function aoSair() {
    await sair();
    navegar("/");
  }

  return (
    <div className="flex min-h-dvh flex-col pb-16 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-borda bg-superficie/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
          <Link
            to="/"
            className={`rounded-md text-xl font-bold tracking-tight text-destaque ${classeFoco}`}
          >
            rrapp
          </Link>
          <nav
            aria-label="Principal"
            className="ml-auto hidden items-center gap-2 text-sm font-medium sm:flex"
          >
            <NavLink to="/buscar" className={classeLinkTopo}>
              Buscar
            </NavLink>
            {usuario ? (
              <>
                <NavLink to={`/u/${usuario.username}`} className={classeLinkTopo}>
                  Meu perfil
                </NavLink>
                <NavLink to="/configuracoes" className={classeLinkTopo}>
                  Configurações
                </NavLink>
                <button
                  type="button"
                  onClick={() => void aoSair()}
                  className={`rounded-md px-2 py-1 text-texto-secundario hover:text-texto ${classeFoco}`}
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <NavLink to="/entrar" className={classeLinkTopo}>
                  Entrar
                </NavLink>
                <Link
                  to="/cadastro"
                  className={`ml-2 rounded-lg bg-destaque px-3 py-1.5 text-sobre-destaque hover:brightness-110 ${classeFoco}`}
                >
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <NavLink to="/" end className={classeLinkInferior}>
          <House aria-hidden="true" className="size-5" />
          Início
        </NavLink>
        <NavLink to="/buscar" className={classeLinkInferior}>
          <Search aria-hidden="true" className="size-5" />
          Buscar
        </NavLink>
        {usuario ? (
          <NavLink to={`/u/${usuario.username}`} className={classeLinkInferior}>
            <UserRound aria-hidden="true" className="size-5" />
            Perfil
          </NavLink>
        ) : (
          <NavLink to="/entrar" className={classeLinkInferior}>
            <LogIn aria-hidden="true" className="size-5" />
            Entrar
          </NavLink>
        )}
      </nav>
    </div>
  );
}
