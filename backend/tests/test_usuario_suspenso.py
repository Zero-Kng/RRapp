from decimal import Decimal

import pytest

from factories import RegistroFactory, RestauranteFactory, UsuarioFactory


@pytest.fixture
def restaurante(db):
    return RestauranteFactory(slug="bar-do-ze")


def suspender(usuario, ativo=False):
    usuario.is_active = ativo
    usuario.save()


@pytest.mark.django_db
def test_registro_de_usuario_suspenso_some_da_api(api, restaurante):
    registro = RegistroFactory(restaurante=restaurante, critica="Ofensiva")
    suspender(registro.usuario)

    assert api.get(f"/api/v1/registros/{registro.id}").status_code == 404
    criticas = api.get("/api/v1/restaurantes/bar-do-ze/registros").json()["results"]
    assert criticas == []


@pytest.mark.django_db
def test_nota_de_usuario_suspenso_sai_da_media_e_volta_ao_reativar(restaurante):
    RegistroFactory(restaurante=restaurante, nota=10)
    abusivo = UsuarioFactory()
    RegistroFactory(usuario=abusivo, restaurante=restaurante, nota=0)
    restaurante.refresh_from_db()
    assert restaurante.nota_media == Decimal("2.50")

    suspender(abusivo)
    restaurante.refresh_from_db()
    assert restaurante.nota_media == Decimal("5.00")
    assert restaurante.total_avaliacoes == 1

    suspender(abusivo, ativo=True)
    restaurante.refresh_from_db()
    assert restaurante.nota_media == Decimal("2.50")
