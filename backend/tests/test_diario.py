import datetime

import pytest

from factories import RegistroFactory, UsuarioFactory


@pytest.fixture
def ana(db):
    return UsuarioFactory(username="ana")


def ids(resposta):
    return [item["id"] for item in resposta.json()["results"]]


@pytest.mark.django_db
def test_diario_em_ordem_da_visita_mais_recente(api, ana):
    velho = RegistroFactory(usuario=ana, data_visita=datetime.date(2025, 12, 1))
    novo = RegistroFactory(usuario=ana, data_visita=datetime.date(2026, 9, 1))
    RegistroFactory(data_visita=datetime.date(2026, 9, 2))  # de outra pessoa

    assert ids(api.get("/api/v1/usuarios/ana/diario")) == [novo.id, velho.id]


@pytest.mark.django_db
def test_diario_filtra_por_ano_e_mes(api, ana):
    setembro = RegistroFactory(usuario=ana, data_visita=datetime.date(2026, 9, 10))
    RegistroFactory(usuario=ana, data_visita=datetime.date(2026, 8, 10))
    RegistroFactory(usuario=ana, data_visita=datetime.date(2025, 9, 10))

    assert ids(api.get("/api/v1/usuarios/ana/diario", {"ano": 2026, "mes": 9})) == [setembro.id]


@pytest.mark.django_db
@pytest.mark.parametrize("parametros", [{"mes": 13}, {"ano": "abc"}, {"mes": 0}])
def test_diario_com_filtro_invalido(api, ana, parametros):
    assert api.get("/api/v1/usuarios/ana/diario", parametros).status_code == 400


@pytest.mark.django_db
def test_criticas_so_registros_com_texto(api, ana):
    com_texto = RegistroFactory(usuario=ana, critica="Excelente")
    RegistroFactory(usuario=ana, critica="")

    assert ids(api.get("/api/v1/usuarios/ana/criticas")) == [com_texto.id]


@pytest.mark.django_db
def test_diario_de_usuario_inexistente(api):
    assert api.get("/api/v1/usuarios/ninguem/diario").status_code == 404
