from io import StringIO

import pytest
from django.core.management import call_command

from helpers_fsq import escrever_categorias, escrever_places_brutos
from lugares.fsq.extracao import extrair_restaurantes, ler_linhas

GASTRONOMIA = "Dining and Drinking"


def place(id_, *, lat=-22.95, lon=-43.19, pais="BR", ids=("c_bar",), rotulos=None):
    return {
        "fsq_place_id": id_,
        "name": f"Lugar {id_}",
        "latitude": lat,
        "longitude": lon,
        "address": "Rua A, 1",
        "date_closed": None,
        "fsq_category_ids": list(ids),
        "fsq_category_labels": rotulos or [f"{GASTRONOMIA} > Bar"],
        "country": pais,
        "region": "RJ",
    }


@pytest.fixture
def arquivos(tmp_path):
    places = escrever_places_brutos(
        tmp_path / "places.parquet",
        [
            place("dentro-bar"),
            place("dentro-loja", ids=("c_loja",), rotulos=["Retail > Loja"]),
            place("sao-paulo", lat=-23.55, lon=-46.63),
            place("outro-pais", pais="AR"),
            place(
                "dentro-misto",
                ids=("c_loja", "c_cafe"),
                rotulos=["Retail > Loja", f"{GASTRONOMIA} > Café"],
            ),
        ],
    )
    categorias = escrever_categorias(
        tmp_path / "categorias.parquet",
        [
            {"category_id": "c_bar", "level1_category_name": GASTRONOMIA},
            {"category_id": "c_cafe", "level1_category_name": GASTRONOMIA},
            {"category_id": "c_loja", "level1_category_name": "Retail"},
        ],
    )
    return places, categorias, tmp_path / "saida" / "rio.parquet"


def test_extrai_so_gastronomia_do_brasil_dentro_da_caixa(arquivos):
    places, categorias, destino = arquivos
    destino.parent.mkdir()

    total = extrair_restaurantes(str(places), str(categorias), destino)

    linhas = list(ler_linhas(destino))
    assert total == 2
    assert {linha["fsq_place_id"] for linha in linhas} == {"dentro-bar", "dentro-misto"}


def test_linhas_lidas_tem_as_colunas_esperadas(arquivos):
    places, categorias, destino = arquivos
    destino.parent.mkdir()
    extrair_restaurantes(str(places), str(categorias), destino)

    linha = next(item for item in ler_linhas(destino) if item["fsq_place_id"] == "dentro-bar")

    assert linha["name"] == "Lugar dentro-bar"
    assert linha["latitude"] == pytest.approx(-22.95)
    assert linha["date_closed"] is None
    assert linha["fsq_category_ids"] == ["c_bar"]
    assert linha["fsq_category_labels"] == [f"{GASTRONOMIA} > Bar"]


def test_comando_extrair_fsq_cria_pasta_e_informa_total(arquivos):
    places, categorias, destino = arquivos
    saida = StringIO()

    call_command(
        "extrair_fsq",
        "--places",
        str(places),
        "--categorias",
        str(categorias),
        "--destino",
        str(destino),
        stdout=saida,
    )

    assert destino.exists()
    assert "extraídos: 2" in saida.getvalue()
