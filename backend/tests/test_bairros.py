import json

import pytest

from lugares.bairros import LocalizadorDeBairros


def quadrado(lon_min, lat_min, lon_max, lat_max):
    return [
        [
            [lon_min, lat_min],
            [lon_max, lat_min],
            [lon_max, lat_max],
            [lon_min, lat_max],
            [lon_min, lat_min],
        ]
    ]


GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"nome": "Botafogo"},
            "geometry": {
                "type": "Polygon",
                "coordinates": quadrado(-43.20, -22.96, -43.18, -22.94),
            },
        },
        {
            "type": "Feature",
            "properties": {"nome": "Jardim Botânico"},
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [
                    quadrado(-43.18, -22.96, -43.16, -22.94),
                    quadrado(-43.10, -22.96, -43.08, -22.94),
                ],
            },
        },
    ],
}


@pytest.fixture
def localizador():
    return LocalizadorDeBairros(GEOJSON)


def test_ponto_dentro_de_poligono(localizador):
    assert localizador.bairro_de(-22.95, -43.19) == "Botafogo"


def test_ponto_na_segunda_parte_de_multipoligono(localizador):
    assert localizador.bairro_de(-22.95, -43.09) == "Jardim Botânico"


def test_ponto_fora_de_qualquer_bairro(localizador):
    assert localizador.bairro_de(-23.50, -43.50) == ""


def test_ponto_na_divisa_pertence_a_um_dos_vizinhos(localizador):
    assert localizador.bairro_de(-22.95, -43.18) in {"Botafogo", "Jardim Botânico"}


def test_coordenadas_nulas_nao_quebram(localizador):
    assert localizador.bairro_de(None, -43.19) == ""
    assert localizador.bairro_de(-22.95, None) == ""


def test_carrega_de_arquivo_utf8(tmp_path):
    caminho = tmp_path / "bairros.geojson"
    caminho.write_text(json.dumps(GEOJSON, ensure_ascii=False), encoding="utf-8")

    localizador = LocalizadorDeBairros.de_arquivo(caminho)

    assert localizador.bairro_de(-22.95, -43.17) == "Jardim Botânico"


def test_campo_de_nome_inexistente_explica_opcoes():
    with pytest.raises(ValueError, match="Disponíveis: nome"):
        LocalizadorDeBairros(GEOJSON, campo_nome="NOME")
