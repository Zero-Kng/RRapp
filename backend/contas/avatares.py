"""Avatar: valida o conteúdo real e regrava a imagem do zero (sem EXIF/GPS)."""

from django.core.files.base import ContentFile

from config.imagens import abrir_imagem, regravar_webp

TAMANHO_MAXIMO = 2 * 1024 * 1024
LADO_MAXIMO = 512
PIXELS_MAXIMOS = 12_000_000  # evita "bombas de descompressão" e picos de memória
FORMATOS_ACEITOS = {"JPEG", "PNG", "WEBP"}
MENSAGEM_FORMATO = "Envie uma imagem JPG, PNG ou WebP."


def processar_avatar(arquivo) -> ContentFile:
    imagem = abrir_imagem(
        arquivo,
        tamanho_maximo=TAMANHO_MAXIMO,
        pixels_maximos=PIXELS_MAXIMOS,
        formatos=FORMATOS_ACEITOS,
        mensagem_formato=MENSAGEM_FORMATO,
        mensagem_tamanho="A imagem deve ter no máximo 2 MB.",
    )
    return regravar_webp(imagem, LADO_MAXIMO)
