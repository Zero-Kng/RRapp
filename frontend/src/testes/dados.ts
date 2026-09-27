import type {
  Cidade,
  Desejo,
  Foto,
  Eu,
  Pagina,
  PerfilPublico,
  Registro,
  RestauranteDetalhe,
  RestauranteResumo,
} from "../api/tipos";

export const cidadeRio: Cidade = { slug: "rio-de-janeiro", nome: "Rio de Janeiro", estado: "RJ" };

export const eu: Eu = {
  username: "ana",
  email: "ana@example.com",
  nome_exibicao: "Ana",
  bio: "",
  avatar: null,
  cidade: cidadeRio,
  membro_desde: "2026-09-01T12:00:00-03:00",
};

export const aprazivel: RestauranteResumo = {
  slug: "aprazivel-santa-teresa",
  nome: "Aprazível",
  bairro: "Santa Teresa",
  cidade: cidadeRio,
  categorias: [{ slug: "brasileira", nome: "Brasileira" }],
  faixa_preco: 3,
  nota_media: 4.5,
  total_avaliacoes: 12,
  status: "ativo",
};

export const aprazivelDetalhe: RestauranteDetalhe = {
  ...aprazivel,
  endereco: "Rua Aprazível, 62",
  latitude: -22.92,
  longitude: -43.19,
  link_mapa: "https://www.google.com/maps/search/?api=1&query=-22.92%2C-43.19",
  histograma: [0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 5].map((quantidade, indice) => ({
    nota: indice / 2,
    quantidade,
  })),
  meu_ultimo_registro: null,
  na_minha_lista_de_desejos: false,
};

export function registro(sobrescrever: Partial<Registro> = {}): Registro {
  return {
    id: 1,
    restaurante: aprazivel,
    usuario: { username: "ana", nome_exibicao: "Ana", avatar: null },
    data_visita: "2026-09-20",
    nota: 3.5,
    critica: "Vista linda.",
    curtiu: true,
    revisita: false,
    fotos: [],
    criado_em: "2026-09-20T21:00:00-03:00",
    atualizado_em: "2026-09-20T21:00:00-03:00",
    ...sobrescrever,
  };
}

export function foto(sobrescrever: Partial<Foto> = {}): Foto {
  const id = sobrescrever.id ?? 1;
  return {
    id,
    imagem: `http://localhost:3000/media/fotos/grande-${id}.webp`,
    miniatura: `http://localhost:3000/media/fotos/mini-${id}.webp`,
    largura: 1600,
    altura: 1200,
    ...sobrescrever,
  };
}

export function desejo(sobrescrever: Partial<Desejo> = {}): Desejo {
  return { restaurante: aprazivel, adicionado_em: "2026-09-21T12:00:00-03:00", ...sobrescrever };
}

export const perfilAna: PerfilPublico = {
  username: "ana",
  nome_exibicao: "Ana",
  bio: "Amo boteco",
  avatar: null,
  cidade: cidadeRio,
  membro_desde: "2026-09-01T12:00:00-03:00",
  numeros: { visitados: 3, visitados_este_ano: 2 },
};

export function pagina<T>(resultados: T[], extras: Partial<Pagina<T>> = {}): Pagina<T> {
  return { count: resultados.length, next: null, previous: null, results: resultados, ...extras };
}
