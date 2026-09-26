import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import { api } from "../api/cliente";
import { aplicarErros, codigoDeErro, dados } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Campo } from "../componentes/Campo";
import { PaginaFormulario } from "../componentes/PaginaFormulario";

const esquema = z
  .object({
    nova_senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((valores) => valores.nova_senha === valores.confirmacao, {
    message: "As senhas não conferem.",
    path: ["confirmacao"],
  });
type Dados = z.infer<typeof esquema>;

function LinkNovoPedido() {
  return (
    <Link to="/esqueci-senha" className="font-semibold text-destaque hover:underline">
      Pedir novo link
    </Link>
  );
}

export function RedefinirSenha() {
  const [parametros] = useSearchParams();
  const uid = parametros.get("uid");
  const token = parametros.get("token");
  const [concluido, setConcluido] = useState(false);
  const [erroGeral, setErroGeral] = useState<{ mensagem: string; linkInvalido: boolean } | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  if (!uid || !token) {
    return (
      <PaginaFormulario titulo="Redefinir senha">
        <Aviso>
          Este link está incompleto. Abra o link do e-mail de novo ou <LinkNovoPedido />.
        </Aviso>
      </PaginaFormulario>
    );
  }

  async function enviar({ nova_senha }: Dados) {
    setErroGeral(null);
    try {
      await dados(
        api.POST("/api/v1/auth/senha/redefinir", {
          body: { uid: uid!, token: token!, nova_senha },
        }),
      );
      setConcluido(true);
    } catch (erro) {
      const mensagem = aplicarErros(erro, setError, ["nova_senha"] as const);
      if (mensagem) {
        setErroGeral({ mensagem, linkInvalido: codigoDeErro(erro) === "link_invalido" });
      }
    }
  }

  if (concluido) {
    return (
      <PaginaFormulario titulo="Redefinir senha">
        <Aviso tipo="sucesso">
          Senha redefinida. Por segurança, as outras sessões foram encerradas.
        </Aviso>
        <Link
          to="/entrar"
          className="mt-6 inline-block text-sm font-semibold text-destaque hover:underline"
        >
          Entrar
        </Link>
      </PaginaFormulario>
    );
  }

  return (
    <PaginaFormulario titulo="Redefinir senha" subtitulo="Escolha uma senha nova para a sua conta.">
      <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
        {erroGeral && (
          <Aviso>
            {erroGeral.mensagem}
            {erroGeral.linkInvalido && (
              <>
                {" "}
                <LinkNovoPedido />
              </>
            )}
          </Aviso>
        )}
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          autoFocus
          dica="Pelo menos 8 caracteres."
          erro={errors.nova_senha?.message}
          {...register("nova_senha")}
        />
        <Campo
          rotulo="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          erro={errors.confirmacao?.message}
          {...register("confirmacao")}
        />
        <Botao type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Salvando…" : "Redefinir senha"}
        </Botao>
      </form>
    </PaginaFormulario>
  );
}
