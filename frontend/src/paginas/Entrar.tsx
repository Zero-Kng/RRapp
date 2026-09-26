import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { mensagemDeErro } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Campo } from "../componentes/Campo";
import { PaginaFormulario } from "../componentes/PaginaFormulario";
import { useSessao } from "../sessao/contexto";
import { destinoSeguro } from "../util/destino";

const esquema = z.object({
  login: z.string().trim().min(1, "Informe seu e-mail ou usuário."),
  senha: z.string().min(1, "Informe sua senha."),
});
type Dados = z.infer<typeof esquema>;

export function Entrar() {
  const { entrar } = useSessao();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  async function enviar({ login, senha }: Dados) {
    setErroGeral(null);
    try {
      await entrar(login, senha);
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
      return;
    }
    // Fora do try: um erro de navegação não deve parecer falha de login
    navegar(destinoSeguro(parametros.get("voltar")), { replace: true });
  }

  return (
    <PaginaFormulario titulo="Entrar" subtitulo="Seu diário de restaurantes continua daqui.">
      <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
        {erroGeral && <Aviso>{erroGeral}</Aviso>}
        <Campo
          rotulo="E-mail ou usuário"
          autoComplete="username"
          autoFocus
          erro={errors.login?.message}
          {...register("login")}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          erro={errors.senha?.message}
          {...register("senha")}
        />
        <Link
          to="/esqueci-senha"
          className="-mt-1 self-start text-sm font-medium text-destaque hover:underline"
        >
          Esqueci minha senha
        </Link>
        <Botao type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Botao>
      </form>
      <p className="mt-6 text-sm text-texto-secundario">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-semibold text-destaque hover:underline">
          Criar conta
        </Link>
      </p>
    </PaginaFormulario>
  );
}
