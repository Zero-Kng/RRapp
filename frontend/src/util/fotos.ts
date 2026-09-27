// Os mesmos limites que o backend aplica às fotos das visitas
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;
export const MAXIMO_FOTOS = 4;
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
// Tipos e extensões: sem a extensão, o seletor de arquivos esconde o HEIC quando o sistema não
// conhece o tipo dele (comum no Windows)
export const ACEITAS_NO_SELETOR = [
  ...TIPOS_FOTO,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
].join(",");
export const MENSAGEM_LIMITE_FOTOS = `Cada visita pode ter até ${MAXIMO_FOTOS} fotos.`;

const EXTENSOES_FOTO = /\.(jpe?g|png|webp|heic|heif)$/i;

export function validarFoto(arquivo: File): string | null {
  // HEIC do iPhone costuma chegar sem tipo no Windows: aí decide a extensão (e o servidor confere)
  const tipoAceito = arquivo.type
    ? TIPOS_FOTO.includes(arquivo.type)
    : EXTENSOES_FOTO.test(arquivo.name);
  if (!tipoAceito) return "Envie uma imagem JPG, PNG, WebP ou HEIC.";
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return "A imagem deve ter no máximo 10 MB.";
  return null;
}
