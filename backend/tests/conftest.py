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


@pytest.fixture
def usuario(db):
    from factories import UsuarioFactory

    return UsuarioFactory(username="ana", email="ana@example.com")


@pytest.fixture
def api_logado(api, usuario):
    api.force_authenticate(usuario)
    return api


@pytest.fixture
def admin_logado(client, django_user_model):
    """Superusuário logado e com o segundo fator (TOTP) já verificado na sessão."""
    from django_otp import DEVICE_ID_SESSION_KEY
    from django_otp.plugins.otp_totp.models import TOTPDevice

    usuario = django_user_model.objects.create_superuser(
        "admin", "admin@example.com", "senha-forte-123"
    )
    dispositivo = TOTPDevice.objects.create(user=usuario, name="teste", confirmed=True)
    client.force_login(usuario)
    sessao = client.session
    sessao[DEVICE_ID_SESSION_KEY] = dispositivo.persistent_id
    sessao.save()
    return client
