from decimal import Decimal

import pytest

from factories import CategoriaFactory, CidadeFactory, RestauranteFactory
from lugares.models import Restaurante

URL = "/api/v1/restaurantes"


def nomes(resposta):
    return [item["nome"] for item in resposta.json()["results"]]


@pytest.mark.django_db
@pytest.mark.parametrize("termo", ["feijoada", "FEIJOÁDA", "Feijo"])
def test_busca_ignora_acentos_e_maiusculas(api, termo):
    RestauranteFactory(nome="Feijoáda do Zé")
    RestauranteFactory(nome="Cantina")

    assert nomes(api.get(URL, {"q": termo})) == ["Feijoáda do Zé"]


@pytest.mark.django_db
def test_busca_com_varias_palavras_exige_todas(api):
    RestauranteFactory(nome="Café do Centro")
    RestauranteFactory(nome="Café da Praia")

    assert nomes(api.get(URL, {"q": "cafe centro"})) == ["Café do Centro"]


@pytest.mark.django_db
def test_simbolos_sao_buscados_literalmente(api):
    RestauranteFactory(nome="Bar 100% Carioca")
    RestauranteFactory(nome="Bar 1000 Carioca")

    assert nomes(api.get(URL, {"q": "100%"})) == ["Bar 100% Carioca"]


@pytest.mark.django_db
def test_termo_longo_demais_responde_400(api):
    resposta = api.get(URL, {"q": "a" * 1000})

    assert resposta.status_code == 400
    assert "q" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_relevancia_poe_quem_comeca_com_o_termo_primeiro(api):
    RestauranteFactory(nome="Casa do Sushi")
    RestauranteFactory(nome="Sushi Leblon")

    assert nomes(api.get(URL, {"q": "sushi"})) == ["Sushi Leblon", "Casa do Sushi"]


@pytest.mark.django_db
def test_filtros_de_bairro_categoria_preco_nota_e_cidade(api, rio):
    japones = CategoriaFactory(slug="japones")
    alvo = RestauranteFactory(
        nome="Alvo", cidade=rio, bairro="Botafogo", faixa_preco=2, nota_media=Decimal("4.5")
    )
    alvo.categorias.add(japones)
    RestauranteFactory(nome="Outro bairro", cidade=rio, bairro="Tijuca", faixa_preco=2)
    RestauranteFactory(nome="Outra cidade", cidade=CidadeFactory(), bairro="Botafogo")

    resposta = api.get(
        URL,
        {
            "cidade": "rio-de-janeiro",
            "bairro": "botafogo",
            "categoria": "japones",
            "preco": 2,
            "nota_min": "4",
        },
    )

    assert nomes(resposta) == ["Alvo"]


@pytest.mark.django_db
@pytest.mark.parametrize("parametros", [{"preco": 5}, {"nota_min": "5.5"}, {"ordem": "aleatoria"}])
def test_filtros_invalidos_respondem_400(api, parametros):
    assert api.get(URL, parametros).status_code == 400


@pytest.mark.django_db
def test_pendentes_nao_aparecem_e_fechados_aparecem_com_status(api):
    RestauranteFactory(nome="Pendente", status=Restaurante.Status.PENDENTE)
    RestauranteFactory(nome="Fechado", status=Restaurante.Status.FECHADO)

    itens = api.get(URL).json()["results"]

    assert [(item["nome"], item["status"]) for item in itens] == [("Fechado", "fechado")]


@pytest.mark.django_db
def test_ordem_por_nota_deixa_sem_nota_por_ultimo(api):
    RestauranteFactory(nome="Sem nota")
    RestauranteFactory(nome="Nota 3", nota_media=Decimal("3.0"), total_avaliacoes=1)
    RestauranteFactory(nome="Nota 5", nota_media=Decimal("5.0"), total_avaliacoes=1)

    assert nomes(api.get(URL, {"ordem": "nota"})) == ["Nota 5", "Nota 3", "Sem nota"]


@pytest.mark.django_db
def test_resultado_e_paginado_e_traz_o_resumo(api):
    restaurante = RestauranteFactory(nome="Bar do Zé", nota_media=Decimal("3.5"))
    restaurante.categorias.add(CategoriaFactory(nome="Boteco", slug="boteco"))

    corpo = api.get(URL).json()

    assert corpo["count"] == 1
    item = corpo["results"][0]
    assert item["nota_media"] == 3.5
    assert item["categorias"] == [{"slug": "boteco", "nome": "Boteco"}]
    assert item["cidade"]["slug"] == restaurante.cidade.slug


@pytest.mark.django_db
def test_lista_de_cidades(api):
    assert api.get("/api/v1/cidades").json() == [
        {"slug": "rio-de-janeiro", "nome": "Rio de Janeiro", "estado": "RJ"}
    ]


@pytest.mark.django_db
def test_lista_de_categorias_em_ordem_alfabetica(api):
    CategoriaFactory(nome="Pizzaria", slug="pizzaria")
    CategoriaFactory(nome="Boteco", slug="boteco")

    assert [c["nome"] for c in api.get("/api/v1/categorias").json()] == ["Boteco", "Pizzaria"]


@pytest.mark.django_db
def test_lista_de_bairros_da_cidade(api, rio):
    RestauranteFactory(cidade=rio, bairro="Tijuca")
    RestauranteFactory(cidade=rio, bairro="Botafogo")
    RestauranteFactory(cidade=rio, bairro="Botafogo")
    RestauranteFactory(cidade=rio, bairro="Lapa", status=Restaurante.Status.PENDENTE)

    assert api.get("/api/v1/bairros", {"cidade": "rio-de-janeiro"}).json() == [
        "Botafogo",
        "Tijuca",
    ]


@pytest.mark.django_db
def test_bairros_exige_cidade(api):
    resposta = api.get("/api/v1/bairros")

    assert resposta.status_code == 400
    assert "cidade" in resposta.json()["erro"]["campos"]
