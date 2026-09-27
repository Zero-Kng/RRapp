from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, JpegImagePlugin
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


def jpeg_com_imagens_embutidas() -> SimpleUploadedFile:
    """JPEG com um 2º quadro no bloco MPF (ex.: iPhone com mapa de HDR): o Pillow o chama de MPO."""
    buffer = BytesIO()
    principal = Image.new("RGB", (1200, 900), "orange")
    principal.save(
        buffer, format="MPO", save_all=True, append_images=[Image.new("RGB", (300, 225))]
    )
    return SimpleUploadedFile("IMG_0001.JPG", buffer.getvalue())


def test_jpeg_com_imagens_embutidas_e_aceito():
    foto = processar_foto(jpeg_com_imagens_embutidas())

    assert (foto.largura, foto.altura) == (1200, 900)


def test_jpeg_grande_e_decodificado_ja_reduzido(monkeypatch):
    # Decodificar 40 MP inteiros e copiar várias vezes passa de 400 MB de memória;
    # o JPEG é decodificado já perto de 1.600 px (draft)
    pedidos = []
    original = JpegImagePlugin.JpegImageFile.draft  # o JPEG (e o MPO) tem o próprio draft

    def espiar(imagem, modo, tamanho):
        pedidos.append((modo, tamanho))
        return original(imagem, modo, tamanho)

    monkeypatch.setattr(JpegImagePlugin.JpegImageFile, "draft", espiar)

    foto = processar_foto(arquivo("JPEG", (6400, 4800)))

    # O 1º pedido é o que vale (antes de decodificar); o thumbnail do Pillow chama outros depois
    assert pedidos[0] == ("RGB", (1600, 1600))
    assert (foto.largura, foto.altura) == (1600, 1200)


def test_miniatura_sai_da_versao_grande_sem_copiar_o_original(monkeypatch):
    tamanhos_copiados = []
    original = Image.Image.copy

    def espiar(imagem):
        tamanhos_copiados.append(imagem.size)
        return original(imagem)

    monkeypatch.setattr(Image.Image, "copy", espiar)

    processar_foto(arquivo("PNG", (3200, 2400)))

    assert all(max(tamanho) <= 1600 for tamanho in tamanhos_copiados)
