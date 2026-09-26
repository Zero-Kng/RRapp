import { createContext, useContext } from "react";
import type { Eu } from "../api/tipos";

export type DadosCadastro = {
  username: string;
  email: string;
  senha: string;
  aceite_termos: boolean;
};

export type ContextoSessao = {
  usuario: Eu | null;
  carregando: boolean;
  /** A pessoa saiu (ou excluiu a conta) por vontade própria, não por sessão expirada. */
  saiu: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  cadastrar: (dados: DadosCadastro) => Promise<void>;
  sair: (opcoes?: { chamarApi?: boolean }) => Promise<void>;
  atualizarUsuario: (usuario: Eu) => void;
};

export const Contexto = createContext<ContextoSessao | null>(null);

export function useSessao(): ContextoSessao {
  const contexto = useContext(Contexto);
  if (contexto === null) throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  return contexto;
}
