import json
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from helpers_fsq import escrever_extraido
from lugares.models import Restaurante

BOTAFOGO = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"nome": "Botafogo"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-43.20, -22.96],
                        [-43.18, -22.96],
                        [-43.18, -22.94],
                        [-43.20, -22.94],
                        [-43.20, -22.96],
                    ]
                ],
            },
        }
    ],
}


def linha(id_, lat, lon):
    return {
        "fsq_place_id": id_,
        "name": f"Restaurante {id_}",
        "latitude": lat,
        "longitude": lon,
        "address": "Rua X",
        "date_closed": None,
        "fsq_category_ids": ["c_rest"],
        "fsq_category_labels": ["Dining and Drinking > Restaurant"],
    }


@pytest.fixture
def arquivos(tmp_path):
    parquet = escrever_extraido(
        tmp_path / "rio.parquet",
        [linha("dentro", -22.95, -43.19), linha("niteroi", -22.90, -43.10)],
    )
    geojson = tmp_path / "bairros.geojson"
    geojson.write_text(json.dumps(BOTAFOGO), encoding="utf-8")
    return parquet, geojson


def test_importa_de_ponta_a_ponta(rio, arquivos):
    parquet, geojson = arquivos
    saida = StringIO()

    call_command(
        "importar_restaurantes",
        "--arquivo",
        str(parquet),
        "--cidade",
        "rio-de-janeiro",
        "--bairros",
        str(geojson),
        stdout=saida,
    )

    restaurante = Restaurante.objects.get()
    assert restaurante.id_externo == "dentro"
    assert restaurante.bairro == "Botafogo"
    assert "criados: 1" in saida.getvalue()
    assert "ignorados_fora_da_cidade: 1" in saida.getvalue()


def test_cidade_inexistente_da_erro_claro(db, arquivos):
    parquet, _ = arquivos
    with pytest.raises(CommandError, match="não cadastrada"):
        call_command("importar_restaurantes", "--arquivo", str(parquet), "--cidade", "atlantida")


def test_arquivo_inexistente_da_erro_claro(rio, tmp_path):
    with pytest.raises(CommandError, match="não encontrado"):
        call_command(
            "importar_restaurantes",
            "--arquivo",
            str(tmp_path / "nao-existe.parquet"),
            "--cidade",
            "rio-de-janeiro",
        )


def test_campo_de_bairro_errado_da_erro_claro(rio, arquivos):
    parquet, geojson = arquivos
    with pytest.raises(CommandError, match="Disponíveis: nome"):
        call_command(
            "importar_restaurantes",
            "--arquivo",
            str(parquet),
            "--cidade",
            "rio-de-janeiro",
            "--bairros",
            str(geojson),
            "--campo-bairro",
            "NOME",
        )
