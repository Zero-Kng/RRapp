import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/cliente";
import { dados } from "../api/erros";
import { aoMudarAcesso, definirAcesso, renovarSessao, tokenDeAcesso } from "../api/sessao";
import type { Eu } from "../api/tipos";
import { Contexto, type ContextoSessao, type DadosCadastro } from "./contexto";

type Props = {
  children: ReactNode;
  /** Nos testes: começa já com este usuário, sem tentar recuperar a sessão. */
  inicial?: { usuario: Eu | null };
};

export function SessaoProvider({ children, inicial }: Props) {
  const clienteConsultas = useQueryClient();
  const temInicial = inicial !== undefined;
  const [usuario, setUsuario] = useState<Eu | null>(inicial?.usuario ?? null);
  const [carregando, setCarregando] = useState(!temInicial);

  // Ao abrir o app, recupera a sessão pelo cookie de renovação (se houver)
  useEffect(() => {
    if (temInicial) return;
    let ativo = true;
    renovarSessao()
      .then(async (renovou) => {
        if (!renovou) return;
        const eu = await dados(api.GET("/api/v1/auth/eu"));
        if (ativo) setUsuario(eu);
      })
      .catch(() => undefined)
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [temInicial]);

  // Se a sessão expirar durante o uso (renovação falhou), esquece o usuário
  useEffect(
    () =>
      aoMudarAcesso(() => {
        if (tokenDeAcesso() === null) setUsuario(null);
      }),
    [],
  );

  const entrar = useCallback(async (login: string, senha: string) => {
    const sessao = await dados(api.POST("/api/v1/auth/login", { body: { login, senha } }));
    definirAcesso(sessao.acesso);
    setUsuario(sessao.usuario);
  }, []);

  const cadastrar = useCallback(async (corpo: DadosCadastro) => {
    const sessao = await dados(api.POST("/api/v1/auth/cadastro", { body: corpo }));
    definirAcesso(sessao.acesso);
    setUsuario(sessao.usuario);
  }, []);

  const sair = useCallback(
    async ({ chamarApi = true }: { chamarApi?: boolean } = {}) => {
      if (chamarApi) await api.POST("/api/v1/auth/logout").catch(() => undefined);
      definirAcesso(null);
      setUsuario(null);
      clienteConsultas.clear();
    },
    [clienteConsultas],
  );

  const valor = useMemo<ContextoSessao>(
    () => ({ usuario, carregando, entrar, cadastrar, sair, atualizarUsuario: setUsuario }),
    [usuario, carregando, entrar, cadastrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
