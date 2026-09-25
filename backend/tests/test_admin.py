import pytest

from factories import CategoriaFactory, RestauranteFactory


def url(settings, caminho):
    return f"/{settings.ADMIN_URL}{caminho}"


@pytest.mark.django_db
def test_lista_de_restaurantes_mostra_e_busca(admin_logado, settings):
    RestauranteFactory(nome="Bar do Zé", bairro="Botafogo")
    RestauranteFactory(nome="Cantina Italiana", bairro="Tijuca")

    resposta = admin_logado.get(url(settings, "lugares/restaurante/"), {"q": "Zé"})

    conteudo = resposta.content.decode()
    assert resposta.status_code == 200
    assert "Bar do Zé" in conteudo
    assert "Cantina Italiana" not in conteudo


@pytest.mark.django_db
def test_lista_de_restaurantes_filtra_por_status(admin_logado, settings):
    RestauranteFactory(nome="Aberto")
    RestauranteFactory(nome="Fechadinho", status="fechado")

    resposta = admin_logado.get(url(settings, "lugares/restaurante/"), {"status__exact": "fechado"})

    conteudo = resposta.content.decode()
    assert "Fechadinho" in conteudo
    assert "Aberto" not in conteudo


@pytest.mark.django_db
def test_pagina_de_edicao_do_restaurante_abre(admin_logado, settings):
    restaurante = RestauranteFactory()

    resposta = admin_logado.get(url(settings, f"lugares/restaurante/{restaurante.pk}/change/"))

    assert resposta.status_code == 200


@pytest.mark.django_db
def test_lista_de_categorias_permite_editar_nome(admin_logado, settings):
    CategoriaFactory(nome="Japanese Restaurant")

    resposta = admin_logado.get(url(settings, "lugares/categoria/"))

    assert resposta.status_code == 200
    assert 'name="form-0-nome"' in resposta.content.decode()


@pytest.mark.django_db
def test_lista_de_cidades_mostra_o_rio(admin_logado, settings):
    resposta = admin_logado.get(url(settings, "lugares/cidade/"))

    assert "Rio de Janeiro" in resposta.content.decode()


@pytest.mark.django_db
def test_lista_de_registros_no_admin(admin_logado, settings):
    from factories import RegistroFactory

    RegistroFactory(nota=7, restaurante__nome="Bar do Zé")

    resposta = admin_logado.get(url(settings, "registros/registro/"))

    assert resposta.status_code == 200
    assert "3.5 ★" in resposta.content.decode()
