from django.db import migrations


def criar_rio(apps, schema_editor):
    Cidade = apps.get_model("lugares", "Cidade")
    Cidade.objects.get_or_create(
        slug="rio-de-janeiro", defaults={"nome": "Rio de Janeiro", "estado": "RJ"}
    )


def remover_rio(apps, schema_editor):
    Cidade = apps.get_model("lugares", "Cidade")
    Cidade.objects.filter(slug="rio-de-janeiro").delete()


class Migration(migrations.Migration):
    dependencies = [("lugares", "0001_initial")]

    operations = [migrations.RunPython(criar_rio, remover_rio)]
