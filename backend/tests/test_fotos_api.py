import threading
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from PIL import Image

import registros.views_fotos as views_fotos
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


@pytest.mark.django_db(transaction=True)
def test_dois_envios_simultaneos_nao_passam_de_4_fotos(midia_temporaria, monkeypatch):
    from rest_framework.test import APIClient

    dono = UsuarioFactory()
    registro = RegistroFactory(usuario=dono)
    for _ in range(3):
        FotoRegistroFactory(registro=registro)
    # Os dois envios terminam de processar a imagem juntos, antes de gravar
    barreira = threading.Barrier(2)
    original = views_fotos.processar_foto

    def processar_junto(arquivo):
        foto = original(arquivo)
        barreira.wait(timeout=10)
        return foto

    monkeypatch.setattr(views_fotos, "processar_foto", processar_junto)
    codigos = []

    def enviar_em_paralelo():
        cliente = APIClient()
        cliente.force_authenticate(dono)
        codigos.append(enviar(cliente, registro, arquivo((64, 48))).status_code)
        connection.close()

    threads = [threading.Thread(target=enviar_em_paralelo) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert sorted(codigos) == [201, 400]
    assert FotoRegistro.objects.filter(registro=registro).count() == 4
