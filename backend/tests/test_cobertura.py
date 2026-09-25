from io import StringIO

import pytest
from django.core.management import call_command

from factories import CategoriaFactory, CidadeFactory, RestauranteFactory
from lugares.cobertura import gerar_relatorio
from lugares.models import Restaurante


@pytest.mark.django_db
def test_relatorio_conta_status_bairros_e_categorias(rio):
    japones = CategoriaFactory(nome="Japonês")
    boteco = CategoriaFactory(nome="Boteco")
    RestauranteFactory(cidade=rio, bairro="Botafogo").categorias.add(japones)
    RestauranteFactory(cidade=rio, bairro="Botafogo").categorias.add(japones, boteco)
    RestauranteFactory(cidade=rio, bairro="Tijuca")
    RestauranteFactory(cidade=rio, bairro="", status=Restaurante.Status.FECHADO)
    RestauranteFactory(cidade=CidadeFactory(), bairro="Centro").categorias.add(boteco)

    relatorio = gerar_relatorio(rio)

    assert relatorio["total"] == 4
    assert relatorio["por_status"] == {"ativo": 3, "fechado": 1}
    assert relatorio["sem_bairro"] == 1
    assert relatorio["top_bairros"] == [("Botafogo", 2), ("Tijuca", 1)]
    assert relatorio["top_categorias"] == [("Japonês", 2), ("Boteco", 1)]


@pytest.mark.django_db
def test_relatorio_de_cidade_vazia(rio):
    relatorio = gerar_relatorio(rio)

    assert relatorio == {
        "total": 0,
        "por_status": {},
        "sem_bairro": 0,
        "top_bairros": [],
        "top_categorias": [],
    }


@pytest.mark.django_db
def test_comando_imprime_relatorio(rio):
    RestauranteFactory(cidade=rio, bairro="Botafogo")
    saida = StringIO()

    call_command("relatorio_cobertura", "--cidade", "rio-de-janeiro", stdout=saida)

    texto = saida.getvalue()
    assert "total: 1" in texto
    assert "Botafogo: 1" in texto
