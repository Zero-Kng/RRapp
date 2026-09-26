import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Carregando } from "../componentes/Carregando";
import { useSessao } from "./contexto";

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando, saiu } = useSessao();
  const { pathname, search } = useLocation();

  if (carregando) return <Carregando />;
  // Quem acabou de sair vai para o início; a navegação do router tem prioridade menor que a
  // mudança de sessão, então esta rota redesenha antes de o navegar("/") de quem saiu valer
  if (!usuario && saiu) return <Navigate to="/" replace />;
  if (!usuario) {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return children;
}
