import datetime
from decimal import Decimal

import pytest

from factories import RegistroFactory, RestauranteFactory, UsuarioFactory
from lugares.models import Restaurante


@pytest.fixture
def restaurante(db):
    return RestauranteFactory(
        slug="bar-do-ze",
        nome="Bar do Zé",
        endereco="Rua X, 10",
        latitude=Decimal("-22.951234"),
        longitude=Decimal("-43.187654"),
    )


@pytest.mark.django_db
def test_detalhe_publico(api, restaurante):
    RegistroFactory(restaurante=restaurante, nota=7)

    corpo = api.get("/api/v1/restaurantes/bar-do-ze").json()

    assert corpo["nome"] == "Bar do Zé"
    assert corpo["endereco"] == "Rua X, 10"
    assert corpo["latitude"] == pytest.approx(-22.951234)
    assert corpo["nota_media"] == 3.5
    assert len(corpo["histograma"]) == 11
    assert corpo["histograma"][7] == {"nota": 3.5, "quantidade": 1}
    assert corpo["link_mapa"].startswith("https://www.google.com/maps/search/?api=1&query=")
    assert corpo["meu_ultimo_registro"] is None


@pytest.mark.django_db
def test_link_do_mapa_sem_coordenadas_usa_nome_e_bairro(api):
    RestauranteFactory(slug="sem-coord", nome="Bar", bairro="Lapa")

    link = api.get("/api/v1/restaurantes/sem-coord").json()["link_mapa"]

    assert "Bar%2C%20Lapa" in link


@pytest.mark.django_db
def test_detalhe_mostra_meu_registro_mais_recente(api, restaurante):
    ana = UsuarioFactory()
    RegistroFactory(
        usuario=ana, restaurante=restaurante, nota=4, data_visita=datetime.date(2026, 1, 1)
    )
    recente = RegistroFactory(
        usuario=ana, restaurante=restaurante, nota=9, data_visita=datetime.date(2026, 9, 1)
    )
    RegistroFactory(restaurante=restaurante, data_visita=datetime.date(2026, 9, 20))
    api.force_authenticate(ana)

    meu = api.get("/api/v1/restaurantes/bar-do-ze").json()["meu_ultimo_registro"]

    assert meu == {"id": recente.id, "data_visita": "2026-09-01", "nota": 4.5, "curtiu": False}


@pytest.mark.django_db
def test_restaurante_pendente_responde_404(api):
    RestauranteFactory(slug="pendente", status=Restaurante.Status.PENDENTE)

    resposta = api.get("/api/v1/restaurantes/pendente")

    assert resposta.status_code == 404
    assert resposta.json()["erro"]["codigo"] == "nao_encontrado"


@pytest.mark.django_db
def test_registros_do_restaurante_so_com_critica_e_recentes_primeiro(api, restaurante):
    RegistroFactory(restaurante=restaurante, critica="")
    antiga = RegistroFactory(restaurante=restaurante, critica="Boa")
    nova = RegistroFactory(restaurante=restaurante, critica="Ótima")
    RegistroFactory(critica="De outro restaurante")

    corpo = api.get("/api/v1/restaurantes/bar-do-ze/registros").json()

    assert [item["id"] for item in corpo["results"]] == [nova.id, antiga.id]


@pytest.mark.django_db
def test_registros_de_restaurante_inexistente_responde_404(api):
    assert api.get("/api/v1/restaurantes/nao-existe/registros").status_code == 404


@pytest.mark.django_db
def test_flag_de_desejo_no_detalhe(api, usuario):
    from factories import DesejoFactory

    restaurante = RestauranteFactory()
    url = f"/api/v1/restaurantes/{restaurante.slug}"
    assert api.get(url).json()["na_minha_lista_de_desejos"] is False

    api.force_authenticate(usuario)
    assert api.get(url).json()["na_minha_lista_de_desejos"] is False
    DesejoFactory(usuario=usuario, restaurante=restaurante)
    assert api.get(url).json()["na_minha_lista_de_desejos"] is True
