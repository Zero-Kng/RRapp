import pytest
from django.db import IntegrityError, transaction

from lugares.models import Cidade


def test_rio_de_janeiro_existe_apos_migracoes(rio):
    assert rio.nome == "Rio de Janeiro"
    assert rio.estado == "RJ"
    assert str(rio) == "Rio de Janeiro (RJ)"


@pytest.mark.django_db
def test_nome_e_estado_sao_unicos_juntos():
    Cidade.objects.create(nome="Niterói", estado="RJ", slug="niteroi")
    with pytest.raises(IntegrityError), transaction.atomic():
        Cidade.objects.create(nome="Niterói", estado="RJ", slug="niteroi-2")


@pytest.mark.django_db
def test_slug_e_unico():
    with pytest.raises(IntegrityError), transaction.atomic():
        Cidade.objects.create(nome="Outra", estado="SP", slug="rio-de-janeiro")
