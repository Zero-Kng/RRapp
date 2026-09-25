import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from lugares.fsq.extracao import BBOX_RIO, extrair_restaurantes


def _bbox(texto: str) -> tuple[float, float, float, float]:
    partes = [float(parte) for parte in texto.split(",")]
    if len(partes) != 4:
        raise ValueError("use lat_min,lon_min,lat_max,lon_max")
    return partes[0], partes[1], partes[2], partes[3]


class Command(BaseCommand):
    help = "Filtra a base FSQ Open Source Places e grava os restaurantes da região em Parquet."

    def add_arguments(self, parser):
        parser.add_argument(
            "--places", required=True, help="Parquet(s) de places (aceita * e hf://)"
        )
        parser.add_argument("--categorias", required=True, help="Parquet(s) de categorias")
        parser.add_argument("--destino", required=True, type=Path)
        parser.add_argument("--pais", default="BR")
        parser.add_argument(
            "--bbox", type=_bbox, default=BBOX_RIO, help="lat_min,lon_min,lat_max,lon_max"
        )

    def handle(self, *args, **opcoes):
        destino: Path = opcoes["destino"]
        destino.parent.mkdir(parents=True, exist_ok=True)
        try:
            total = extrair_restaurantes(
                opcoes["places"],
                opcoes["categorias"],
                destino,
                pais=opcoes["pais"],
                bbox=opcoes["bbox"],
                hf_token=os.environ.get("HF_TOKEN"),
            )
        except Exception as erro:
            raise CommandError(f"Falha na extração: {erro}") from erro
        self.stdout.write(f"extraídos: {total}")
        self.stdout.write(f"arquivo: {destino}")
