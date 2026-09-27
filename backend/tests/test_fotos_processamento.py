from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from pillow_heif import register_heif_opener
from rest_framework import serializers

from registros import fotos
from registros.fotos import processar_foto

register_heif_opener()

EXTENSOES = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "HEIF": "heic"}


def arquivo(formato="JPEG", tamanho=(800, 600), exif=None) -> SimpleUploadedFile:
    buffer = BytesIO()
    extras = {"exif": exif} if exif else {}
    Image.new("RGB", tamanho, "orange").save(buffer, format=formato, **extras)
    return SimpleUploadedFile(f"foto.{EXTENSOES.get(formato, 'bin')}", buffer.getvalue())


def mensagem(erro: pytest.ExceptionInfo) -> str:
    return str(erro.value.detail[0])


@pytest.mark.parametrize("formato", ["JPEG", "PNG", "WEBP", "HEIF"])
def test_formatos_aceitos_viram_duas_versoes_webp(formato):
    foto = processar_foto(arquivo(formato, (3200, 2400)))

    for versao, lado in [(foto.imagem, 1600), (foto.miniatura, 480)]:
        with Image.open(versao) as salva:
            assert salva.format == "WEBP"
            assert max(salva.size) == lado
    assert (foto.largura, foto.altura) == (1600, 1200)
    assert foto.imagem.name.endswith(".webp")
    assert foto.imagem.name != foto.miniatura.name


def test_foto_pequena_nao_e_ampliada():
    foto = processar_foto(arquivo("JPEG", (800, 600)))

    assert (foto.largura, foto.altura) == (800, 600)


def test_exif_e_gps_sao_removidos():
    exif = Image.Exif()
    exif[0x010F] = "Marca da Câmera"
    exif[0x8825] = {2: (22.0, 57.0, 0.0)}  # bloco de GPS

    foto = processar_foto(arquivo("JPEG", exif=exif))

    for versao in (foto.imagem, foto.miniatura):
        with Image.open(versao) as salva:
            assert dict(salva.getexif()) == {}


def test_retrato_do_celular_fica_de_pe():
    exif = Image.Exif()
    exif[0x0112] = 6  # orientação: girar 90°

    foto = processar_foto(arquivo("JPEG", (2000, 1000), exif=exif))

    assert (foto.largura, foto.altura) == (800, 1600)


def test_maior_que_10_mb_e_recusado():
    grande = SimpleUploadedFile("g.jpg", b"0" * (10 * 1024 * 1024 + 1))

    with pytest.raises(serializers.ValidationError) as erro:
        processar_foto(grande)

    assert mensagem(erro) == "A imagem deve ter no máximo 10 MB."


def test_acima_do_limite_de_pixels_e_recusado(monkeypatch):
    # Gerar 40 MP de verdade pesaria na memória do teste; o limite é reduzido aqui
    monkeypatch.setattr(fotos, "PIXELS_MAXIMOS", 1_000_000)

    with pytest.raises(serializers.ValidationError) as erro:
        processar_foto(arquivo("JPEG", (1200, 1000)))

    assert mensagem(erro) == "A imagem é grande demais (dimensões)."


@pytest.mark.parametrize("conteudo", ["GIF", "texto"])
def test_formato_nao_aceito(conteudo):
    enviado = (
        arquivo("GIF", (100, 100))
        if conteudo == "GIF"
        else SimpleUploadedFile("foto.jpg", b"isto nao e uma imagem")
    )

    with pytest.raises(serializers.ValidationError) as erro:
        processar_foto(enviado)

    assert mensagem(erro) == "Envie uma imagem JPG, PNG, WebP ou HEIC."
