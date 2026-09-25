from django.core.management.base import BaseCommand, CommandError

from lugares.cobertura import gerar_relatorio
from lugares.models import Cidade


class Command(BaseCommand):
    help = "Mostra quantos restaurantes a cidade tem, por status, bairro e categoria."

    def add_arguments(self, parser):
        parser.add_argument("--cidade", required=True, help="slug da cidade")

    def handle(self, *args, **opcoes):
        try:
            cidade = Cidade.objects.get(slug=opcoes["cidade"])
        except Cidade.DoesNotExist as erro:
            raise CommandError(f"Cidade '{opcoes['cidade']}' não cadastrada.") from erro

        relatorio = gerar_relatorio(cidade)
        self.stdout.write(f"cidade: {cidade}")
        self.stdout.write(f"total: {relatorio['total']}")
        self.stdout.write(f"sem bairro: {relatorio['sem_bairro']}")
        for status, quantidade in relatorio["por_status"].items():
            self.stdout.write(f"status {status}: {quantidade}")
        self.stdout.write("bairros com mais restaurantes:")
        for bairro, quantidade in relatorio["top_bairros"]:
            self.stdout.write(f"  {bairro}: {quantidade}")
        self.stdout.write("categorias mais comuns:")
        for categoria, quantidade in relatorio["top_categorias"]:
            self.stdout.write(f"  {categoria}: {quantidade}")
