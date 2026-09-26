import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const [saiu, setSaiu] = useState(false);

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

  // Parte das respostas depende de quem vê (ex.: meu_ultimo_registro): ao entrar, sair, recuperar
  // ou perder a sessão, as consultas viram "velhas" e as da tela são buscadas de novo, sem tirar
  // os dados da tela (zerar faria a página piscar em "Carregando" e perder a aba escolhida)
  const identidade = useRef(usuario?.username ?? null);
  useEffect(() => {
    const atual = usuario?.username ?? null;
    if (atual === identidade.current) return;
    identidade.current = atual;
    void clienteConsultas.invalidateQueries();
  }, [usuario, clienteConsultas]);

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
    setSaiu(false);
    setUsuario(sessao.usuario);
  }, []);

  const cadastrar = useCallback(async (corpo: DadosCadastro) => {
    const sessao = await dados(api.POST("/api/v1/auth/cadastro", { body: corpo }));
    definirAcesso(sessao.acesso);
    setSaiu(false);
    setUsuario(sessao.usuario);
  }, []);

  const sair = useCallback(
    async ({ chamarApi = true }: { chamarApi?: boolean } = {}) => {
      if (chamarApi) await api.POST("/api/v1/auth/logout").catch(() => undefined);
      definirAcesso(null);
      setSaiu(true);
      setUsuario(null);
      clienteConsultas.clear();
    },
    [clienteConsultas],
  );

  const valor = useMemo<ContextoSessao>(
    () => ({ usuario, carregando, saiu, entrar, cadastrar, sair, atualizarUsuario: setUsuario }),
    [usuario, carregando, saiu, entrar, cadastrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
