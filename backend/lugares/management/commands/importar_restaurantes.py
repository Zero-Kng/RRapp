from dataclasses import asdict
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from lugares.bairros import LocalizadorDeBairros
from lugares.fsq.extracao import ler_linhas
from lugares.importacao import importar_restaurantes
from lugares.models import Cidade


class Command(BaseCommand):
    help = "Importa restaurantes de um Parquet gerado por `extrair_fsq`."

    def add_arguments(self, parser):
        parser.add_argument("--arquivo", required=True, type=Path)
        parser.add_argument("--cidade", required=True, help="slug da cidade (ex.: rio-de-janeiro)")
        parser.add_argument("--bairros", type=Path, help="GeoJSON (WGS84) com limites de bairros")
        parser.add_argument("--campo-bairro", default="nome", help="propriedade com o nome")

    def handle(self, *args, **opcoes):
        try:
            cidade = Cidade.objects.get(slug=opcoes["cidade"])
        except Cidade.DoesNotExist as erro:
            raise CommandError(f"Cidade '{opcoes['cidade']}' não cadastrada.") from erro

        arquivo: Path = opcoes["arquivo"]
        if not arquivo.exists():
            raise CommandError(f"Arquivo {arquivo} não encontrado.")

        localizador = None
        if opcoes["bairros"]:
            try:
                localizador = LocalizadorDeBairros.de_arquivo(
                    opcoes["bairros"], opcoes["campo_bairro"]
                )
            except (OSError, ValueError) as erro:
                raise CommandError(str(erro)) from erro

        resultado = importar_restaurantes(ler_linhas(arquivo), cidade, localizador)
        for campo, valor in asdict(resultado).items():
            self.stdout.write(f"{campo}: {valor}")
