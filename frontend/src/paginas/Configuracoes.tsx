import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { api } from "../api/cliente";
import { aplicarErros, dados, errosDeCampo, mensagemDeErro } from "../api/erros";
import type { components } from "../api/esquema";
import { definirAcesso } from "../api/sessao";
import type { Eu } from "../api/tipos";
import { Avatar } from "../componentes/Avatar";
import { Aviso } from "../componentes/Aviso";
import { Botao } from "../componentes/Botao";
import { Campo, classeEntrada } from "../componentes/Campo";
import { useSessao } from "../sessao/contexto";
import { SeletorTema } from "../tema/SeletorTema";
import { TIPOS_AVATAR, validarAvatar } from "../util/avatar";
import { useTitulo } from "../util/titulo";

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="border-t border-borda py-8 first:border-t-0 first:pt-0"
    >
      <h2 id={id} className="text-lg font-bold">
        {titulo}
      </h2>
      {descricao && <p className="mt-1 text-sm text-texto-secundario">{descricao}</p>}
      <div className="mt-5 max-w-md">{children}</div>
    </section>
  );
}

// ---------- Perfil ----------

const esquemaPerfil = z.object({
  nome_exibicao: z.string().max(50, "Use até 50 caracteres."),
  bio: z.string().max(300, "A bio pode ter até 300 caracteres."),
  cidade: z.string(),
});
type DadosPerfil = z.infer<typeof esquemaPerfil>;

function SecaoPerfil({ usuario }: { usuario: Eu }) {
  const { atualizarUsuario } = useSessao();
  const clienteConsultas = useQueryClient();
  const idBio = useId();
  const idCidade = useId();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erroAvatar, setErroAvatar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const cidades = useQuery({
    queryKey: ["cidades"],
    queryFn: () => dados(api.GET("/api/v1/cidades")),
    staleTime: Infinity,
  });
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DadosPerfil>({
    resolver: zodResolver(esquemaPerfil),
    defaultValues: {
      nome_exibicao: usuario.nome_exibicao,
      bio: usuario.bio,
      cidade: usuario.cidade?.slug ?? "",
    },
  });
  const tamanhoBio = useWatch({ control, name: "bio" })?.length ?? 0;

  // libera a URL da prévia anterior quando ela é trocada ou a página sai
  useEffect(() => {
    if (!previa) return;
    return () => URL.revokeObjectURL(previa);
  }, [previa]);

  function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0] ?? null;
    setAviso(null);
    if (!escolhido) return;
    const erro = validarAvatar(escolhido);
    setErroAvatar(erro);
    if (erro) {
      setArquivo(null);
      setPrevia(null);
      evento.target.value = "";
      return;
    }
    setArquivo(escolhido);
    setRemoverFoto(false);
    setPrevia(URL.createObjectURL(escolhido));
  }

  async function enviar(valores: DadosPerfil) {
    setAviso(null);
    const cidade = valores.cidade || null;
    try {
      let atualizado: Eu;
      if (arquivo) {
        const formulario = new FormData();
        formulario.append("nome_exibicao", valores.nome_exibicao);
        formulario.append("bio", valores.bio);
        formulario.append("cidade", valores.cidade);
        formulario.append("avatar", arquivo);
        atualizado = await dados(
          api.PATCH("/api/v1/eu/perfil", {
            body: formulario as unknown as components["schemas"]["PatchedAtualizarPerfilRequest"],
          }),
        );
      } else {
        atualizado = await dados(
          api.PATCH("/api/v1/eu/perfil", {
            body: { ...valores, cidade, ...(removerFoto ? { remover_avatar: true } : {}) },
          }),
        );
      }
      atualizarUsuario(atualizado);
      void clienteConsultas.invalidateQueries({ queryKey: ["perfil", usuario.username] });
      setArquivo(null);
      setRemoverFoto(false);
      setAviso({ tipo: "sucesso", texto: "Perfil atualizado." });
    } catch (erro) {
      const campos = errosDeCampo(erro);
      if (campos.avatar) setErroAvatar(campos.avatar);
      const geral = aplicarErros(erro, setError, ["nome_exibicao", "bio", "cidade"] as const);
      if (geral && !campos.avatar) setAviso({ tipo: "erro", texto: geral });
    }
  }

  const fotoAtual = removerFoto ? null : (previa ?? usuario.avatar);

  return (
    <form
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      noValidate
      className="flex flex-col gap-5"
    >
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <div className="flex items-center gap-4">
        <Avatar usuario={{ ...usuario, avatar: fotoAtual }} tamanho={64} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="avatar" className="text-sm font-medium">
            Foto de perfil
          </label>
          <input
            id="avatar"
            type="file"
            accept={TIPOS_AVATAR.join(",")}
            onChange={aoEscolherArquivo}
            aria-invalid={erroAvatar ? true : undefined}
            aria-describedby="avatar-ajuda"
            className="text-sm file:mr-3 file:rounded-lg file:border file:border-borda file:bg-superficie file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-texto hover:file:bg-fundo"
          />
          <p
            id="avatar-ajuda"
            className={`text-sm ${erroAvatar ? "text-erro" : "text-texto-secundario"}`}
          >
            {erroAvatar ?? "JPG, PNG ou WebP, até 2 MB."}
          </p>
          {usuario.avatar && !arquivo && !removerFoto && (
            <button
              type="button"
              onClick={() => setRemoverFoto(true)}
              className="self-start text-sm font-medium text-erro hover:underline"
            >
              Remover foto
            </button>
          )}
        </div>
      </div>

      <Campo
        rotulo="Nome de exibição"
        autoComplete="name"
        erro={errors.nome_exibicao?.message}
        {...register("nome_exibicao")}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor={idBio} className="text-sm font-medium">
            Bio
          </label>
          <span
            className={`text-xs tabular-nums ${tamanhoBio > 300 ? "text-erro" : "text-texto-secundario"}`}
          >
            {tamanhoBio}/300
          </span>
        </div>
        <textarea
          id={idBio}
          rows={3}
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={errors.bio ? `${idBio}-erro` : undefined}
          className={`${classeEntrada} resize-y`}
          {...register("bio")}
        />
        {errors.bio && (
          <p id={`${idBio}-erro`} className="text-sm text-erro">
            {errors.bio.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idCidade} className="text-sm font-medium">
          Cidade
        </label>
        <select id={idCidade} className={classeEntrada} {...register("cidade")}>
          <option value="">Não informar</option>
          {(cidades.data ?? []).map((cidade) => (
            <option key={cidade.slug} value={cidade.slug}>
              {cidade.nome}
            </option>
          ))}
        </select>
      </div>

      <Botao type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Salvando…" : "Salvar perfil"}
      </Botao>
    </form>
  );
}

// ---------- Senha ----------

const esquemaSenha = z.object({
  senha_atual: z.string().min(1, "Informe a senha atual."),
  nova_senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});
type DadosSenha = z.infer<typeof esquemaSenha>;

function SecaoSenha() {
  const [aviso, setAviso] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DadosSenha>({ resolver: zodResolver(esquemaSenha) });

  async function enviar(corpo: DadosSenha) {
    setAviso(null);
    try {
      const resposta = await dados(api.POST("/api/v1/eu/senha", { body: corpo }));
      definirAcesso(resposta.acesso);
      reset();
      setAviso({ tipo: "sucesso", texto: "Senha alterada." });
    } catch (erro) {
      const geral = aplicarErros(erro, setError, ["senha_atual", "nova_senha"] as const);
      if (geral) setAviso({ tipo: "erro", texto: geral });
    }
  }

  return (
    <form
      onSubmit={(evento) => void handleSubmit(enviar)(evento)}
      noValidate
      className="flex flex-col gap-4"
    >
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Campo
        rotulo="Senha atual"
        type="password"
        autoComplete="current-password"
        erro={errors.senha_atual?.message}
        {...register("senha_atual")}
      />
      <Campo
        rotulo="Nova senha"
        type="password"
        autoComplete="new-password"
        dica="Pelo menos 8 caracteres."
        erro={errors.nova_senha?.message}
        {...register("nova_senha")}
      />
      <Botao type="submit" variante="secundaria" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Trocando…" : "Trocar senha"}
      </Botao>
    </form>
  );
}

// ---------- Excluir conta ----------

function SecaoExcluir() {
  const { sair } = useSessao();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    try {
      await dados(api.POST("/api/v1/eu/excluir", { body: { senha } }));
      await sair({ chamarApi: false });
      navegar("/", { replace: true });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setExcluindo(false);
    }
  }

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(abrir) => {
        setAberto(abrir);
        setSenha("");
        setErro(null);
      }}
    >
      <Dialog.Trigger asChild>
        <Botao variante="perigo">Excluir conta</Botao>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-borda bg-superficie p-6 shadow-[0_8px_32px_rgb(0_0_0/0.2)]">
          <Dialog.Title className="text-lg font-bold">Excluir sua conta?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-texto-secundario">
            Seu perfil, seu diário e suas críticas serão apagados de forma definitiva. Não dá para
            desfazer.
          </Dialog.Description>
          <form
            className="mt-5 flex flex-col gap-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              void excluir();
            }}
          >
            {erro && <Aviso>{erro}</Aviso>}
            <Campo
              rotulo="Sua senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Botao variante="secundaria">Cancelar</Botao>
              </Dialog.Close>
              <Botao type="submit" variante="perigo" disabled={excluindo || senha.length === 0}>
                {excluindo ? "Excluindo…" : "Excluir definitivamente"}
              </Botao>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// No celular o topo esconde o botão "Sair"; este é o caminho até ele
function SecaoSair() {
  const { sair } = useSessao();
  const navegar = useNavigate();
  const [saindo, setSaindo] = useState(false);

  async function aoSair() {
    setSaindo(true);
    await sair();
    navegar("/");
  }

  return (
    <Botao variante="secundaria" disabled={saindo} onClick={() => void aoSair()}>
      <LogOut aria-hidden="true" className="size-4" />
      {saindo ? "Saindo…" : "Sair da conta"}
    </Botao>
  );
}

export function Configuracoes() {
  useTitulo("Configurações");
  const { usuario } = useSessao();
  if (!usuario) return null; // a rota é protegida; isto só satisfaz o tipo

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Configurações</h1>
      <Secao titulo="Perfil" descricao="O que aparece para quem visita seu perfil.">
        <SecaoPerfil usuario={usuario} />
      </Secao>
      <Secao titulo="Aparência">
        <SeletorTema />
      </Secao>
      <Secao titulo="Senha" descricao="Trocar a senha encerra suas outras sessões.">
        <SecaoSenha />
      </Secao>
      <Secao titulo="Sessão" descricao="Encerra a sessão neste aparelho.">
        <SecaoSair />
      </Secao>
      <Secao titulo="Excluir conta" descricao="Apaga sua conta e todos os seus dados.">
        <SecaoExcluir />
      </Secao>
    </div>
  );
}
