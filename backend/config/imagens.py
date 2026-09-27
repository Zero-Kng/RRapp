"""Imagens enviadas pelos usuários: valida o conteúdo real e regrava do zero (sem EXIF/GPS)."""

from io import BytesIO
from uuid import uuid4

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener
from rest_framework import serializers

register_heif_opener()  # o Pillow passa a abrir HEIC/HEIF (fotos de iPhone)

MENSAGEM_DIMENSOES = "A imagem é grande demais (dimensões)."


def abrir_imagem(
    arquivo,
    *,
    tamanho_maximo: int,
    pixels_maximos: int,
    formatos: set[str],
    mensagem_formato: str,
    mensagem_tamanho: str,
) -> Image.Image:
    """Abre e confere a imagem; devolve-a "de pé" (orientação do EXIF aplicada), em RGB/RGBA."""
    if arquivo.size > tamanho_maximo:
        raise serializers.ValidationError(mensagem_tamanho)
    try:
        imagem = Image.open(arquivo)
        formato = imagem.format
        largura, altura = imagem.size
        # Só decodifica depois de conferir formato e dimensões: evita "bombas de descompressão"
        if formato in formatos and largura * altura <= pixels_maximos:
            imagem.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as erro:
        raise serializers.ValidationError(mensagem_formato) from erro
    if formato not in formatos:
        raise serializers.ValidationError(mensagem_formato)
    if largura * altura > pixels_maximos:
        raise serializers.ValidationError(MENSAGEM_DIMENSOES)

    imagem = ImageOps.exif_transpose(imagem)
    if imagem.mode not in ("RGB", "RGBA"):
        imagem = imagem.convert("RGBA")
    return imagem


def regravar_webp(imagem: Image.Image, lado_maximo: int) -> ContentFile:
    """Cópia reduzida (nunca ampliada), regravada em WebP do zero: sem EXIF, nome aleatório."""
    copia = imagem.copy()
    copia.thumbnail((lado_maximo, lado_maximo))
    saida = BytesIO()
    copia.save(saida, format="WEBP", quality=85)
    return ContentFile(saida.getvalue(), name=f"{uuid4().hex}.webp")
