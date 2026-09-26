import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { api } from "../api/cliente";
import { dados, mensagemDeErro } from "../api/erros";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Campo } from "../componentes/Campo";
import { PaginaFormulario } from "../componentes/PaginaFormulario";

const esquema = z.object({ email: z.email("E-mail inválido.") });
type Dados = z.infer<typeof esquema>;

export function EsqueciSenha() {
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) });

  async function enviar(corpo: Dados) {
    setErroGeral(null);
    try {
      const resposta = await dados(api.POST("/api/v1/auth/senha/esqueci", { body: corpo }));
      setEnviado(resposta.mensagem);
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    }
  }

  return (
    <PaginaFormulario
      titulo="Esqueci minha senha"
      subtitulo="Enviamos um link para você criar uma senha nova."
    >
      {enviado ? (
        <div className="flex flex-col gap-4">
          <Aviso tipo="sucesso">{enviado}</Aviso>
          <p className="text-sm text-texto-secundario">
            O link vale por 1 hora. Não chegou? Confira a caixa de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
          {erroGeral && <Aviso>{erroGeral}</Aviso>}
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            autoFocus
            erro={errors.email?.message}
            {...register("email")}
          />
          <Botao type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Enviando…" : "Enviar link"}
          </Botao>
        </form>
      )}
      <Link
        to="/entrar"
        className="mt-6 inline-block text-sm font-semibold text-destaque hover:underline"
      >
        Voltar para entrar
      </Link>
    </PaginaFormulario>
  );
}
