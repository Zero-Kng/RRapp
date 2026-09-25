"""Avatar: valida o conteúdo real e regrava a imagem do zero (sem EXIF/GPS)."""

from io import BytesIO
from uuid import uuid4

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

TAMANHO_MAXIMO = 2 * 1024 * 1024
LADO_MAXIMO = 512
PIXELS_MAXIMOS = 12_000_000  # evita "bombas de descompressão" e picos de memória
FORMATOS_ACEITOS = {"JPEG", "PNG", "WEBP"}
MENSAGEM_FORMATO = "Envie uma imagem JPG, PNG ou WebP."


def processar_avatar(arquivo) -> ContentFile:
    if arquivo.size > TAMANHO_MAXIMO:
        raise serializers.ValidationError("A imagem deve ter no máximo 2 MB.")
    try:
        imagem = Image.open(arquivo)
        formato = imagem.format
        largura, altura = imagem.size
        if formato in FORMATOS_ACEITOS and largura * altura <= PIXELS_MAXIMOS:
            imagem.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as erro:
        raise serializers.ValidationError(MENSAGEM_FORMATO) from erro
    if formato not in FORMATOS_ACEITOS:
        raise serializers.ValidationError(MENSAGEM_FORMATO)
    if largura * altura > PIXELS_MAXIMOS:
        raise serializers.ValidationError("A imagem é grande demais (dimensões).")

    imagem = ImageOps.exif_transpose(imagem)
    if imagem.mode not in ("RGB", "RGBA"):
        imagem = imagem.convert("RGBA")
    imagem.thumbnail((LADO_MAXIMO, LADO_MAXIMO))
    saida = BytesIO()
    imagem.save(saida, format="WEBP", quality=85)  # regravada do zero: sem EXIF
    return ContentFile(saida.getvalue(), name=f"{uuid4().hex}.webp")
