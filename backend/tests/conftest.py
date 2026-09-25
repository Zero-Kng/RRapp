import pytest


@pytest.fixture
def rio(db):
    from lugares.models import Cidade

    return Cidade.objects.get(slug="rio-de-janeiro")


@pytest.fixture(autouse=True)
def _senhas_rapidas(settings):
    """Argon2 é lento de propósito; nos testes usamos um hasher rápido."""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture(autouse=True)
def _limpar_cache():
    """Os limites de requisição guardam contagens no cache; cada teste começa do zero."""
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    from rest_framework.test import APIClient

    return APIClient()
