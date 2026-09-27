from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from config.api import ThrottleEscrita
from factories import FotoRegistroFactory, RegistroFactory, UsuarioFactory
from registros.models import FotoRegistro

URL = "/api/v1/registros/{}/fotos"


def arquivo(tamanho=(2000, 1500)) -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new("RGB", tamanho, "orange").save(buffer, format="JPEG")
    return SimpleUploadedFile("foto.jpg", buffer.getvalue(), content_type="image/jpeg")


def enviar(api, registro, conteudo=None):
    return api.post(URL.format(registro.id), {"imagem": conteudo or arquivo()}, format="multipart")


def erro_do_campo(resposta) -> list[str]:
    return resposta.json()["erro"]["campos"]["imagem"]


@pytest.mark.django_db
def test_dono_envia_foto(api_logado, usuario, midia_temporaria):
    registro = RegistroFactory(usuario=usuario)

    resposta = enviar(api_logado, registro)

    assert resposta.status_code == 201
    assert resposta.json()["largura"] == 1600
    assert registro.fotos.count() == 1


@pytest.mark.django_db
def test_anonimo_nao_envia(api, midia_temporaria):
    assert enviar(api, RegistroFactory()).status_code == 401


@pytest.mark.django_db
def test_outra_pessoa_nao_envia(api_logado, midia_temporaria):
    registro = RegistroFactory()  # de outro usuário

    assert enviar(api_logado, registro).status_code == 403
    assert not FotoRegistro.objects.exists()


@pytest.mark.django_db
def test_registro_de_suspenso_ou_inexistente(api_logado, midia_temporaria):
    suspenso = UsuarioFactory(is_active=False)
    assert enviar(api_logado, RegistroFactory(usuario=suspenso)).status_code == 404
    resposta = api_logado.post(URL.format(999999), {"imagem": arquivo()}, format="multipart")
    assert resposta.status_code == 404


@pytest.mark.django_db
def test_quinta_foto_e_recusada(api_logado, usuario, midia_temporaria):
    registro = RegistroFactory(usuario=usuario)
    for _ in range(4):
        FotoRegistroFactory(registro=registro)

    resposta = enviar(api_logado, registro)

    assert resposta.status_code == 400
    assert erro_do_campo(resposta) == ["Cada visita pode ter até 4 fotos."]
    assert registro.fotos.count() == 4


@pytest.mark.django_db
def test_arquivo_invalido_da_erro_no_campo(api_logado, usuario, midia_temporaria):
    invalido = SimpleUploadedFile("foto.jpg", b"isto nao e uma imagem", content_type="image/jpeg")

    resposta = enviar(api_logado, RegistroFactory(usuario=usuario), invalido)

    assert resposta.status_code == 400
    assert erro_do_campo(resposta) == ["Envie uma imagem JPG, PNG, WebP ou HEIC."]


@pytest.mark.django_db
def test_envio_sem_arquivo_da_erro_no_campo(api_logado, usuario, midia_temporaria):
    registro = RegistroFactory(usuario=usuario)

    resposta = api_logado.post(URL.format(registro.id), {}, format="multipart")

    assert resposta.status_code == 400
    assert "imagem" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_envio_de_fotos_e_limitado(api_logado, usuario, monkeypatch, midia_temporaria):
    monkeypatch.setattr(ThrottleEscrita, "THROTTLE_RATES", {"fotos": "2/min"})
    registro = RegistroFactory(usuario=usuario)

    codigos = [enviar(api_logado, registro, arquivo((64, 48))).status_code for _ in range(3)]

    assert codigos == [201, 201, 429]


@pytest.mark.django_db
def test_dono_apaga_foto(api_logado, usuario, midia_temporaria):
    foto = FotoRegistroFactory(registro=RegistroFactory(usuario=usuario))

    resposta = api_logado.delete(f"{URL.format(foto.registro_id)}/{foto.id}")

    assert resposta.status_code == 204
    assert not FotoRegistro.objects.exists()


@pytest.mark.django_db
def test_anonimo_nao_apaga(api, midia_temporaria):
    foto = FotoRegistroFactory()

    assert api.delete(f"{URL.format(foto.registro_id)}/{foto.id}").status_code == 401


@pytest.mark.django_db
def test_outra_pessoa_nao_apaga(api_logado, midia_temporaria):
    foto = FotoRegistroFactory()  # registro de outro usuário

    assert api_logado.delete(f"{URL.format(foto.registro_id)}/{foto.id}").status_code == 403
    assert FotoRegistro.objects.filter(pk=foto.pk).exists()


@pytest.mark.django_db
def test_foto_de_outro_registro_da_404(api_logado, usuario, midia_temporaria):
    meu = RegistroFactory(usuario=usuario)
    foto_alheia = FotoRegistroFactory(registro=RegistroFactory(usuario=usuario))

    assert api_logado.delete(f"{URL.format(meu.id)}/{foto_alheia.id}").status_code == 404
    assert FotoRegistro.objects.filter(pk=foto_alheia.pk).exists()


@pytest.mark.django_db
def test_registro_so_com_foto_aparece_no_restaurante_e_nao_nas_criticas(api, midia_temporaria):
    registro = RegistroFactory(critica="")
    FotoRegistroFactory(registro=registro)
    RegistroFactory(
        restaurante=registro.restaurante, critica=""
    )  # sem foto nem texto: fica de fora

    restaurante = api.get(f"/api/v1/restaurantes/{registro.restaurante.slug}/registros")
    criticas = api.get(f"/api/v1/usuarios/{registro.usuario.username}/criticas")

    assert [r["id"] for r in restaurante.json()["results"]] == [registro.id]
    assert registro.id not in [r["id"] for r in criticas.json()["results"]]
