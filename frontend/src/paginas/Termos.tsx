import { useTitulo } from "../util/titulo";

export function Termos() {
  useTitulo("Termos de uso e privacidade");
  return (
    <article className="mx-auto max-w-prose">
      <h1 className="text-2xl font-bold tracking-tight text-balance">
        Termos de uso e privacidade
      </h1>
      <p className="mt-2 text-sm text-texto-secundario">
        Versão 2026-09-25, a ser revisada antes do lançamento público.
      </p>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">O que o rrapp guarda</h2>
          <p className="mt-2">
            Seu nome de usuário, e-mail e senha (guardada de forma protegida, nunca em texto puro).
            O que você escolhe colocar no perfil: nome de exibição, bio, cidade e foto. E os seus
            registros de visita: restaurante, data, nota, crítica e curtida.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Para que usamos</h2>
          <p className="mt-2">
            Para montar o seu diário e o seu perfil, calcular a nota média dos restaurantes e, no
            futuro, mostrar suas críticas a quem segue você. O e-mail serve para entrar na conta e
            para recuperar a senha. Não vendemos nem compartilhamos seus dados.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">O que é público</h2>
          <p className="mt-2">
            Seu perfil, seu diário e suas críticas são visíveis para qualquer pessoa. Seu e-mail
            nunca aparece.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Excluir sua conta</h2>
          <p className="mt-2">
            Em Configurações, você pode excluir a conta a qualquer momento. Isso apaga seus dados
            pessoais, seus registros e suas críticas de forma definitiva.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Contato</h2>
          <p className="mt-2">
            Dúvidas sobre privacidade ou pedidos relacionados à LGPD: fale com o responsável pelo
            rrapp pelo canal em que você recebeu o convite.
          </p>
        </section>
      </div>
    </article>
  );
}
