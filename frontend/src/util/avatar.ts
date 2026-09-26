// Os mesmos limites que o backend aplica ao avatar
export const TAMANHO_MAXIMO_AVATAR = 2 * 1024 * 1024;
export const TIPOS_AVATAR = ["image/jpeg", "image/png", "image/webp"];

export function validarAvatar(arquivo: File): string | null {
  if (!TIPOS_AVATAR.includes(arquivo.type)) return "Envie uma imagem JPG, PNG ou WebP.";
  if (arquivo.size > TAMANHO_MAXIMO_AVATAR) return "A imagem deve ter no máximo 2 MB.";
  return null;
}
