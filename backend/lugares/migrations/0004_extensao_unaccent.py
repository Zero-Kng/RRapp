from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):
    """Busca sem acentos. Em produção, se o usuário do banco não puder criar extensões,
    um administrador roda `CREATE EXTENSION IF NOT EXISTS unaccent;` antes do deploy."""

    dependencies = [("lugares", "0003_categoria_restaurante")]

    operations = [UnaccentExtension()]
