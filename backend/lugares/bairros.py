import json
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.strtree import STRtree


class LocalizadorDeBairros:
    """Descobre o bairro de uma coordenada a partir de um GeoJSON de limites (WGS84)."""

    def __init__(self, geojson: dict, campo_nome: str = "nome") -> None:
        geometrias = []
        nomes = []
        for feature in geojson.get("features", []):
            propriedades = feature.get("properties") or {}
            if campo_nome not in propriedades:
                disponiveis = ", ".join(sorted(propriedades)) or "nenhuma"
                raise ValueError(
                    f"Propriedade '{campo_nome}' não encontrada no GeoJSON. "
                    f"Disponíveis: {disponiveis}."
                )
            geometrias.append(shape(feature["geometry"]))
            nomes.append(str(propriedades[campo_nome]).strip())
        self._nomes = nomes
        self._arvore = STRtree(geometrias)

    @classmethod
    def de_arquivo(cls, caminho: Path, campo_nome: str = "nome") -> LocalizadorDeBairros:
        with open(caminho, encoding="utf-8") as arquivo:
            return cls(json.load(arquivo), campo_nome)

    def bairro_de(self, latitude: float | None, longitude: float | None) -> str:
        if latitude is None or longitude is None:
            return ""
        ponto = Point(float(longitude), float(latitude))
        indices = self._arvore.query(ponto, predicate="intersects")
        if len(indices) == 0:
            return ""
        return self._nomes[int(min(indices))]
