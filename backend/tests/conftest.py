import pytest


@pytest.fixture
def rio(db):
    from lugares.models import Cidade

    return Cidade.objects.get(slug="rio-de-janeiro")
