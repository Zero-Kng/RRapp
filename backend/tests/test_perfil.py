import os
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from factories import RegistroFactory, UsuarioFactory

EDITAR = "/api/v1/eu/perfil"


@pytest.fixture(autouse=True)
def midia_temporaria(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def imagem(formato="JPEG", tamanho=(800, 600), nome="foto.jpg", exif=None) -> SimpleUploadedFile:
    buffer = BytesIO()
    extras = {"exif": exif} if exif else {}
    Image.new("RGB", tamanho, "orange").save(buffer, format=formato, **extras)
    return SimpleUploadedFile(nome, buffer.getvalue(), content_type="image/jpeg")


@pytest.mark.django_db
def test_perfil_publico_sem_email_e_com_numeros(api):
    ana = UsuarioFactory(username="ana", bio="Amo boteco")
    RegistroFactory(usuario=ana, data_visita=timezone.localdate())

    corpo = api.get("/api/v1/usuarios/ANA").json()

    assert corpo["username"] == "ana"
    assert corpo["bio"] == "Amo boteco"
    assert "email" not in corpo
    assert corpo["numeros"] == {"visitados": 1, "visitados_este_ano": 1}


@pytest.mark.django_db
def test_perfil_de_usuario_desativado_nao_aparece(api):
    UsuarioFactory(username="sumiu", is_active=False)

    assert api.get("/api/v1/usuarios/sumiu").status_code == 404


@pytest.mark.django_db
def test_editar_bio_nome_e_cidade(api_logado):
    resposta = api_logado.patch(
        EDITAR, {"bio": "Carioca", "nome_exibicao": "Ana", "cidade": "rio-de-janeiro"}
    )

    assert resposta.status_code == 200
    assert resposta.json()["bio"] == "Carioca"
    assert resposta.json()["cidade"]["slug"] == "rio-de-janeiro"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "dados", [{"bio": "x" * 301}, {"nome_exibicao": "x" * 51}, {"cidade": "atlantida"}]
)
def test_editar_recusa_dados_invalidos(api_logado, dados):
    assert api_logado.patch(EDITAR, dados).status_code == 400


@pytest.mark.django_db
def test_editar_sem_login(api):
    assert api.patch(EDITAR, {"bio": "x"}).status_code == 401


@pytest.mark.django_db
def test_avatar_e_regravado_em_webp_pequeno_com_nome_aleatorio(api_logado, usuario):
    resposta = api_logado.patch(EDITAR, {"avatar": imagem()}, format="multipart")

    assert resposta.status_code == 200
    usuario.refresh_from_db()
    assert usuario.avatar.name.startswith("avatares/")
    assert usuario.avatar.name.endswith(".webp")
    assert "foto" not in usuario.avatar.name
    with Image.open(usuario.avatar.path) as salva:
        assert salva.format == "WEBP"
        assert max(salva.size) == 512


@pytest.mark.django_db
def test_avatar_perde_os_metadados_exif(api_logado, usuario):
    exif = Image.Exif()
    exif[0x010F] = "Marca da Câmera"
    exif[0x0110] = "Modelo com GPS"

    api_logado.patch(EDITAR, {"avatar": imagem(exif=exif)}, format="multipart")

    usuario.refresh_from_db()
    with Image.open(usuario.avatar.path) as salva:
        assert dict(salva.getexif()) == {}


@pytest.mark.django_db
@pytest.mark.parametrize(
    "arquivo",
    [
        SimpleUploadedFile("virus.jpg", b"isto nao e uma imagem", content_type="image/jpeg"),
        imagem(formato="GIF", nome="anim.gif"),
        imagem(tamanho=(6000, 6000)),
    ],
    ids=["nao-imagem", "gif", "gigante"],
)
def test_avatar_invalido_e_recusado(api_logado, arquivo):
    resposta = api_logado.patch(EDITAR, {"avatar": arquivo}, format="multipart")

    assert resposta.status_code == 400
    assert "avatar" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_avatar_maior_que_2mb_e_recusado(api_logado):
    grande = SimpleUploadedFile("g.jpg", b"0" * (2 * 1024 * 1024 + 1), content_type="image/jpeg")

    resposta = api_logado.patch(EDITAR, {"avatar": grande}, format="multipart")

    assert resposta.status_code == 400
    assert resposta.json()["erro"]["campos"]["avatar"] == ["A imagem deve ter no máximo 2 MB."]


@pytest.mark.django_db
def test_trocar_avatar_apaga_o_arquivo_antigo(api_logado, usuario):
    api_logado.patch(EDITAR, {"avatar": imagem()}, format="multipart")
    usuario.refresh_from_db()
    antigo = usuario.avatar.path

    api_logado.patch(EDITAR, {"avatar": imagem()}, format="multipart")

    assert not os.path.exists(antigo)


@pytest.mark.django_db
def test_remover_avatar(api_logado, usuario):
    api_logado.patch(EDITAR, {"avatar": imagem()}, format="multipart")

    resposta = api_logado.patch(EDITAR, {"remover_avatar": True})

    assert resposta.json()["avatar"] is None
    usuario.refresh_from_db()
    assert not usuario.avatar
