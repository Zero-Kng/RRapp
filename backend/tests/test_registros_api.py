import datetime
from decimal import Decimal

import pytest
from django.utils import timezone

from config.api import ThrottleEscrita
from factories import RegistroFactory, RestauranteFactory, UsuarioFactory
from lugares.models import Restaurante

URL = "/api/v1/registros"


@pytest.fixture
def restaurante(db):
    return RestauranteFactory(slug="bar-do-ze", nome="Bar do Zé")


@pytest.mark.django_db
def test_criar_registro_completo(api_logado, restaurante):
    resposta = api_logado.post(
        URL,
        {
            "restaurante_slug": "bar-do-ze",
            "data_visita": "2026-09-20",
            "nota": 3.5,
            "critica": "  Bolinho de bacalhau excelente.  ",
            "curtiu": True,
        },
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["nota"] == 3.5
    assert corpo["critica"] == "Bolinho de bacalhau excelente."
    assert corpo["restaurante"]["slug"] == "bar-do-ze"
    assert corpo["usuario"]["username"] == "ana"
    assert "restaurante_slug" not in corpo
    restaurante.refresh_from_db()
    assert restaurante.nota_media == Decimal("3.50")


@pytest.mark.django_db
def test_so_diario_sem_nota_nem_critica(api_logado, restaurante):
    resposta = api_logado.post(URL, {"restaurante_slug": "bar-do-ze"})

    assert resposta.status_code == 201
    assert resposta.json()["nota"] is None
    assert resposta.json()["data_visita"] == timezone.localdate().isoformat()


@pytest.mark.django_db
def test_criar_sem_login_responde_401(api, restaurante):
    assert api.post(URL, {"restaurante_slug": "bar-do-ze"}).status_code == 401


@pytest.mark.django_db
def test_restaurante_pendente_ou_inexistente_e_recusado(api_logado):
    RestauranteFactory(slug="pendente", status=Restaurante.Status.PENDENTE)

    for slug in ("pendente", "nao-existe"):
        resposta = api_logado.post(URL, {"restaurante_slug": slug})
        assert resposta.status_code == 400
        assert "restaurante_slug" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_data_no_futuro_e_recusada(api_logado, restaurante):
    amanha = timezone.localdate() + datetime.timedelta(days=1)

    resposta = api_logado.post(URL, {"restaurante_slug": "bar-do-ze", "data_visita": str(amanha)})

    assert resposta.status_code == 400
    assert resposta.json()["erro"]["campos"]["data_visita"] == [
        "A data da visita não pode estar no futuro."
    ]


@pytest.mark.django_db
@pytest.mark.parametrize("nota", [3.7, "3,5", 5.5, True])
def test_nota_invalida_e_recusada(api_logado, restaurante, nota):
    resposta = api_logado.post(URL, {"restaurante_slug": "bar-do-ze", "nota": nota})

    assert resposta.status_code == 400
    assert "nota" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_critica_longa_demais_e_recusada(api_logado, restaurante):
    resposta = api_logado.post(URL, {"restaurante_slug": "bar-do-ze", "critica": "x" * 5001})

    assert resposta.status_code == 400
    assert "critica" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_qualquer_pessoa_ve_um_registro(api):
    registro = RegistroFactory(nota=9)

    resposta = api.get(f"{URL}/{registro.id}")

    assert resposta.status_code == 200
    assert resposta.json()["nota"] == 4.5


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("quem", "status_patch", "status_delete"),
    [("anonimo", 401, 401), ("outro", 403, 403), ("staff", 403, 403), ("dono", 200, 204)],
)
def test_matriz_de_permissoes(api, quem, status_patch, status_delete):
    dono = UsuarioFactory()
    registro = RegistroFactory(usuario=dono, nota=6)
    atores = {"outro": UsuarioFactory(), "staff": UsuarioFactory(is_staff=True), "dono": dono}
    if quem in atores:
        api.force_authenticate(atores[quem])

    assert api.patch(f"{URL}/{registro.id}", {"nota": 4}).status_code == status_patch
    assert api.delete(f"{URL}/{registro.id}").status_code == status_delete


@pytest.mark.django_db
def test_dono_edita_nota_e_a_media_acompanha(api, restaurante):
    dono = UsuarioFactory()
    registro = RegistroFactory(usuario=dono, restaurante=restaurante, nota=6)
    api.force_authenticate(dono)

    resposta = api.patch(f"{URL}/{registro.id}", {"nota": 5})

    assert resposta.json()["nota"] == 5.0
    restaurante.refresh_from_db()
    assert restaurante.nota_media == Decimal("5.00")


@pytest.mark.django_db
def test_nao_da_para_trocar_o_restaurante_de_um_registro(api):
    dono = UsuarioFactory()
    registro = RegistroFactory(usuario=dono)
    RestauranteFactory(slug="outro")
    api.force_authenticate(dono)

    resposta = api.patch(f"{URL}/{registro.id}", {"restaurante_slug": "outro"})

    assert resposta.status_code == 400
    assert "restaurante_slug" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_escrita_e_limitada_mas_leitura_nao(api_logado, restaurante, monkeypatch):
    monkeypatch.setattr(ThrottleEscrita, "THROTTLE_RATES", {"escrita": "2/min"})
    registro = RegistroFactory()

    codigos = [
        api_logado.post(URL, {"restaurante_slug": "bar-do-ze"}).status_code for _ in range(3)
    ]

    assert codigos == [201, 201, 429]
    assert api_logado.get(f"{URL}/{registro.id}").status_code == 200
