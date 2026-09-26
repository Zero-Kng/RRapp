import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { aplicarErros } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Campo } from "../componentes/Campo";
import { PaginaFormulario } from "../componentes/PaginaFormulario";
import { useSessao } from "../sessao/contexto";

const esquema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.]{3,30}$/, "Use de 3 a 30 caracteres: letras sem acento, números, _ ou ."),
  email: z.email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  aceite_termos: z.literal(true, { error: "Aceite os termos para continuar." }),
});
type Dados = z.infer<typeof esquema>;

const CAMPOS = ["username", "email", "senha", "aceite_termos"] as const;

export function Cadastro() {
  const { cadastrar } = useSessao();
  const navegar = useNavigate();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  async function enviar(dados: Dados) {
    setErroGeral(null);
    try {
      await cadastrar(dados);
      navegar("/", { replace: true });
    } catch (erro) {
      setErroGeral(aplicarErros(erro, setError, CAMPOS));
    }
  }

  return (
    <PaginaFormulario titulo="Criar conta" subtitulo="Guarde cada restaurante que você visitar.">
      <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
        {erroGeral && <Aviso>{erroGeral}</Aviso>}
        <Campo
          rotulo="Nome de usuário"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          dica="Aparece no endereço do seu perfil."
          erro={errors.username?.message}
          {...register("username")}
        />
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          erro={errors.email?.message}
          {...register("email")}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          dica="Pelo menos 8 caracteres."
          erro={errors.senha?.message}
          {...register("senha")}
        />
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0"
              aria-invalid={errors.aceite_termos ? true : undefined}
              aria-describedby={errors.aceite_termos ? "erro-termos" : undefined}
              {...register("aceite_termos")}
            />
            <span>
              Li e aceito os{" "}
              <Link
                to="/termos"
                target="_blank"
                className="font-semibold text-destaque hover:underline"
              >
                termos de uso e a política de privacidade
              </Link>
            </span>
          </label>
          {errors.aceite_termos && (
            <p id="erro-termos" className="text-sm text-erro">
              {errors.aceite_termos.message}
            </p>
          )}
        </div>
        <Botao type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Criando conta…" : "Criar conta"}
        </Botao>
      </form>
      <p className="mt-6 text-sm text-texto-secundario">
        Já tem conta?{" "}
        <Link to="/entrar" className="font-semibold text-destaque hover:underline">
          Entrar
        </Link>
      </p>
    </PaginaFormulario>
  );
}
