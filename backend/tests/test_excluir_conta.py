import os
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from contas.models import Usuario
from factories import RegistroFactory
from registros.models import Registro

URL = "/api/v1/eu/excluir"


@pytest.mark.django_db
def test_senha_errada_nao_exclui(api_logado, usuario):
    resposta = api_logado.post(URL, {"senha": "errada"})

    assert resposta.status_code == 400
    assert resposta.json()["erro"]["codigo"] == "senha_incorreta"
    assert Usuario.objects.filter(pk=usuario.pk).exists()


@pytest.mark.django_db
def test_excluir_apaga_tudo_e_recalcula_a_media(api, usuario, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    registro = RegistroFactory(usuario=usuario, nota=10)
    restaurante = registro.restaurante
    renovacao = api.post(
        "/api/v1/auth/login", {"login": "ana", "senha": "senha-forte-123"}, HTTP_X_CLIENTE="mobile"
    ).json()["renovacao"]
    api.force_authenticate(usuario)
    buffer = BytesIO()
    Image.new("RGB", (50, 50)).save(buffer, format="PNG")
    api.patch(
        "/api/v1/eu/perfil",
        {"avatar": SimpleUploadedFile("a.png", buffer.getvalue())},
        format="multipart",
    )
    usuario.refresh_from_db()
    caminho_avatar = usuario.avatar.path

    resposta = api.post(URL, {"senha": "senha-forte-123"})

    assert resposta.status_code == 204
    assert resposta.cookies["rrapp_renovacao"].value == ""
    assert not Usuario.objects.filter(pk=usuario.pk).exists()
    assert not Registro.objects.exists()
    assert not os.path.exists(caminho_avatar)
    restaurante.refresh_from_db()
    assert restaurante.nota_media is None
    api.force_authenticate(None)
    assert api.post("/api/v1/auth/token/renovar", {"renovacao": renovacao}).status_code == 401


@pytest.mark.django_db
def test_excluir_sem_login(api):
    assert api.post(URL, {"senha": "x"}).status_code == 401


@pytest.mark.django_db
def test_senha_da_exclusao_aparece_no_esquema_openapi(api):
    esquema = api.get("/api/schema", {"format": "json"}).json()

    corpo = esquema["paths"]["/api/v1/eu/excluir"]["post"]["requestBody"]
    referencia = corpo["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
    assert "senha" in esquema["components"]["schemas"][referencia]["properties"]


@pytest.mark.django_db
def test_excluir_conta_limita_tentativas(api_logado):
    codigos = [api_logado.post(URL, {"senha": "chute"}).status_code for _ in range(6)]

    assert codigos == [400] * 5 + [429]
