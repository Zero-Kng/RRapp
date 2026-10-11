import datetime

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from factories import (
    CategoriaFactory,
    FotoRegistroFactory,
    RegistroFactory,
    RestauranteFactory,
    UsuarioFactory,
)
from lugares.models import Restaurante
from registros.models import Registro

URL = "/api/v1/feed"


def postado(registro: Registro, minutos_atras: int) -> Registro:
    """Fixa a hora da postagem (`criado_em` é preenchido sozinho ao criar)."""
    hora = timezone.now() - datetime.timedelta(minutes=minutos_atras)
    Registro.objects.filter(pk=registro.pk).update(criado_em=hora)
    registro.refresh_from_db()
    return registro


def ids_do_feed(api, url: str = URL) -> list[int]:
    return [item["id"] for item in api.get(url).json()["results"]]


def com_critica(quantidade: int) -> list[Registro]:
    """Registros com crítica, do mais antigo (postado há mais tempo) ao mais novo."""
    return [
        postado(RegistroFactory(critica=f"Crítica {i}"), minutos_atras=quantidade - i)
        for i in range(quantidade)
    ]


@pytest.mark.django_db
def test_entram_so_registros_com_critica_ou_foto(api, midia_temporaria):
    critica = RegistroFactory(critica="Boa")
    so_foto = RegistroFactory(critica="")
    FotoRegistroFactory(registro=so_foto)
    RegistroFactory(critica="")  # só nota: fica de fora

    assert set(ids_do_feed(api)) == {critica.id, so_foto.id}


@pytest.mark.django_db
def test_ordem_e_a_hora_da_postagem_nao_a_data_da_visita(api):
    antiga = postado(
        RegistroFactory(critica="a", data_visita=datetime.date(2026, 9, 30)), minutos_atras=60
    )
    nova = postado(
        RegistroFactory(critica="b", data_visita=datetime.date(2026, 3, 1)), minutos_atras=1
    )

    assert ids_do_feed(api) == [nova.id, antiga.id]


@pytest.mark.django_db
def test_suspensos_e_restaurantes_pendentes_ficam_de_fora(api):
    visivel = RegistroFactory(critica="Fica")
    RegistroFactory(critica="Suspenso", usuario=UsuarioFactory(is_active=False))
    RegistroFactory(
        critica="Pendente", restaurante=RestauranteFactory(status=Restaurante.Status.PENDENTE)
    )

    assert ids_do_feed(api) == [visivel.id]


@pytest.mark.django_db
def test_pagina_tem_20_e_cursor_para_a_proxima(api):
    registros = com_critica(25)

    primeira = api.get(URL).json()
    assert len(primeira["results"]) == 20
    assert "count" not in primeira
    assert "cursor=" in primeira["next"]

    segunda = api.get(primeira["next"]).json()
    assert [item["id"] for item in segunda["results"]] == [r.id for r in reversed(registros[:5])]
    assert segunda["next"] is None


@pytest.mark.django_db
def test_cursor_e_estavel_com_registro_novo(api):
    com_critica(25)
    primeira = api.get(URL).json()
    vistos = {item["id"] for item in primeira["results"]}

    novo = RegistroFactory(critica="Acabou de chegar")
    segunda = [item["id"] for item in api.get(primeira["next"]).json()["results"]]

    assert len(segunda) == 5
    assert not vistos & set(segunda)
    assert novo.id not in segunda


@pytest.mark.django_db
def test_publico_e_com_fotos_na_resposta(api, midia_temporaria):
    foto = FotoRegistroFactory(registro=RegistroFactory(critica=""))

    resposta = api.get(URL)

    assert resposta.status_code == 200
    [item] = resposta.json()["results"]
    [dados_foto] = item["fotos"]
    assert dados_foto["id"] == foto.id
    assert dados_foto["imagem"].endswith(".webp")
    assert dados_foto["miniatura"].endswith(".webp")
    assert (dados_foto["largura"], dados_foto["altura"]) == (foto.largura, foto.altura)


def _criar_itens(quantidade: int) -> None:
    for _ in range(quantidade):
        registro = RegistroFactory(critica="Com tudo")
        registro.restaurante.categorias.add(CategoriaFactory())
        FotoRegistroFactory(registro=registro)


def _consultas(api) -> int:
    with CaptureQueriesContext(connection) as contexto:
        assert api.get(URL).status_code == 200
    return len(contexto.captured_queries)


@pytest.mark.django_db
def test_numero_de_consultas_nao_cresce_com_os_itens(api, midia_temporaria):
    _criar_itens(3)
    com_poucos = _consultas(api)

    _criar_itens(12)

    assert _consultas(api) == com_poucos


@pytest.mark.django_db
def test_pagina_do_restaurante_continua_com_critica_ou_foto(api, midia_temporaria):
    restaurante = RestauranteFactory(slug="bar-do-ze")
    so_foto = RegistroFactory(restaurante=restaurante, critica="")
    FotoRegistroFactory(registro=so_foto)
    RegistroFactory(restaurante=restaurante, critica="")

    corpo = api.get("/api/v1/restaurantes/bar-do-ze/registros").json()

    assert [item["id"] for item in corpo["results"]] == [so_foto.id]
