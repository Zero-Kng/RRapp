"""Imagens enviadas pelos usuários: valida o conteúdo real e regrava do zero (sem EXIF/GPS)."""

from io import BytesIO
from uuid import uuid4

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener
from rest_framework import serializers

register_heif_opener()  # o Pillow passa a abrir HEIC/HEIF (fotos de iPhone)

MENSAGEM_DIMENSOES = "A imagem é grande demais (dimensões)."
# JPEG com imagens embutidas no bloco MPF (ex.: iPhone com mapa de HDR) o Pillow chama de MPO
FORMATOS_JPEG = {"JPEG", "MPO"}


def abrir_imagem(
    arquivo,
    *,
    tamanho_maximo: int,
    pixels_maximos: int,
    formatos: set[str],
    mensagem_formato: str,
    mensagem_tamanho: str,
    reduzir_para: int | None = None,
) -> Image.Image:
    """Abre e confere a imagem; devolve-a "de pé" (orientação do EXIF aplicada), em RGB/RGBA.

    Com `reduzir_para`, um JPEG já é decodificado perto desse lado (draft): uma foto de 40 MP
    não ocupa centenas de MB de memória só para virar 1.600 px.
    """
    if arquivo.size > tamanho_maximo:
        raise serializers.ValidationError(mensagem_tamanho)
    try:
        imagem = Image.open(arquivo)
        formato = imagem.format
        largura, altura = imagem.size
        # Só decodifica depois de conferir formato e dimensões: evita "bombas de descompressão"
        if formato in formatos and largura * altura <= pixels_maximos:
            if reduzir_para and formato in FORMATOS_JPEG:
                imagem.draft("RGB", (reduzir_para, reduzir_para))
            imagem.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as erro:
        raise serializers.ValidationError(mensagem_formato) from erro
    if formato not in formatos:
        raise serializers.ValidationError(mensagem_formato)
    if largura * altura > pixels_maximos:
        raise serializers.ValidationError(MENSAGEM_DIMENSOES)

    ImageOps.exif_transpose(imagem, in_place=True)
    if imagem.mode not in ("RGB", "RGBA"):
        imagem = imagem.convert("RGBA")
    return imagem


def regravar_webp(imagem: Image.Image, lado_maximo: int) -> ContentFile:
    """Reduz a PRÓPRIA imagem (nunca amplia) e a regrava em WebP do zero: sem EXIF, nome
    aleatório. Reduzir no lugar evita copiar a imagem original, que pode ser enorme."""
    imagem.thumbnail((lado_maximo, lado_maximo))
    saida = BytesIO()
    imagem.save(saida, format="WEBP", quality=85)
    return ContentFile(saida.getvalue(), name=f"{uuid4().hex}.webp")
