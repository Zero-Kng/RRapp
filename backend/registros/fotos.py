"""Fotos das visitas: até 10 MB e 40 MP, regravadas em WebP em duas versões."""

from dataclasses import dataclass

from django.core.files.base import ContentFile
from PIL import Image

from config.imagens import abrir_imagem, regravar_webp

TAMANHO_MAXIMO = 10 * 1024 * 1024
PIXELS_MAXIMOS = 40_000_000
LADO_GRANDE = 1600
LADO_MINIATURA = 480
FORMATOS = {"JPEG", "PNG", "WEBP", "HEIF"}
MENSAGEM_FORMATO = "Envie uma imagem JPG, PNG, WebP ou HEIC."
MENSAGEM_TAMANHO = "A imagem deve ter no máximo 10 MB."


@dataclass
class FotoProcessada:
    imagem: ContentFile
    miniatura: ContentFile
    largura: int
    altura: int


def processar_foto(arquivo) -> FotoProcessada:
    imagem = abrir_imagem(
        arquivo,
        tamanho_maximo=TAMANHO_MAXIMO,
        pixels_maximos=PIXELS_MAXIMOS,
        formatos=FORMATOS,
        mensagem_formato=MENSAGEM_FORMATO,
        mensagem_tamanho=MENSAGEM_TAMANHO,
    )
    grande = regravar_webp(imagem, LADO_GRANDE)
    with Image.open(grande) as gravada:  # dimensões exatas do que foi gravado (só lê o cabeçalho)
        largura, altura = gravada.size
    grande.seek(0)
    return FotoProcessada(
        imagem=grande,
        miniatura=regravar_webp(imagem, LADO_MINIATURA),
        largura=largura,
        altura=altura,
    )
