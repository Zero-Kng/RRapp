import type { components } from "./esquema";

type Esquemas = components["schemas"];

export type Eu = Esquemas["Eu"];
export type Cidade = Esquemas["Cidade"];
export type Categoria = Esquemas["Categoria"];
export type RestauranteResumo = Esquemas["RestauranteResumo"];
export type RestauranteDetalhe = Esquemas["RestauranteDetalhe"];
export type BarraHistograma = Esquemas["BarraHistograma"];
export type MeuRegistro = Esquemas["MeuRegistro"];
export type Registro = Esquemas["Registro"];
export type PerfilPublico = Esquemas["PerfilPublico"];
export type Desejo = Esquemas["Desejo"];

export type Pagina<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
