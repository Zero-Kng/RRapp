type Props = {
  usuario: { username: string; nome_exibicao: string; avatar: string | null };
  tamanho?: number;
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes.at(-1)![0] : nome.slice(0, 2);
  return letras.toUpperCase();
}

export function Avatar({ usuario, tamanho = 40 }: Props) {
  const nome = usuario.nome_exibicao || usuario.username;
  const estilo = { width: tamanho, height: tamanho };

  if (usuario.avatar) {
    return (
      <img
        src={usuario.avatar}
        alt=""
        style={estilo}
        className="shrink-0 rounded-full object-cover ring-1 ring-borda"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...estilo, fontSize: tamanho * 0.38 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-destaque/15 font-semibold text-destaque"
    >
      {iniciais(nome)}
    </span>
  );
}
