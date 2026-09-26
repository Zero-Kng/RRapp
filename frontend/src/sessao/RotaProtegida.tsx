import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Carregando } from "../componentes/Carregando";
import { useSessao } from "./contexto";

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();
  const { pathname, search } = useLocation();

  if (carregando) return <Carregando />;
  if (!usuario) {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return children;
}
