import pytest
from rest_framework.test import APIClient

from contas.autenticacao import encerrar_sessoes

LOGIN = "/api/v1/auth/login"
RENOVAR = "/api/v1/auth/token/renovar"
LOGOUT = "/api/v1/auth/logout"
CREDENCIAIS = {"login": "ana", "senha": "senha-forte-123"}


@pytest.fixture
def navegador(usuario):
    """Cliente que exige CSRF, como um navegador de verdade."""
    cliente = APIClient(enforce_csrf_checks=True)
    assert cliente.post(LOGIN, CREDENCIAIS).status_code == 200
    return cliente


def csrf(cliente):
    return cliente.cookies["csrftoken"].value


@pytest.mark.django_db
def test_renovar_com_cookie_e_csrf_rotaciona_o_token(navegador):
    antigo = navegador.cookies["rrapp_renovacao"].value

    resposta = navegador.post(RENOVAR, HTTP_X_CSRFTOKEN=csrf(navegador))

    assert resposta.status_code == 200
    assert resposta.json()["acesso"]
    assert "renovacao" not in resposta.json()
    assert navegador.cookies["rrapp_renovacao"].value != antigo


@pytest.mark.django_db
def test_renovar_com_cookie_sem_csrf_e_recusado(navegador):
    resposta = navegador.post(RENOVAR)

    assert resposta.status_code == 403
    assert resposta.json()["erro"]["codigo"] == "sem_permissao"


@pytest.mark.django_db
def test_token_antigo_nao_serve_depois_da_rotacao(navegador):
    antigo = navegador.cookies["rrapp_renovacao"].value
    navegador.post(RENOVAR, HTTP_X_CSRFTOKEN=csrf(navegador))
    navegador.cookies["rrapp_renovacao"] = antigo

    resposta = navegador.post(RENOVAR, HTTP_X_CSRFTOKEN=csrf(navegador))

    assert resposta.status_code == 401
    assert resposta.json()["erro"]["codigo"] == "sessao_expirada"


@pytest.mark.django_db
def test_renovar_sem_cookie_nem_corpo(api):
    resposta = api.post(RENOVAR)

    assert resposta.status_code == 401
    assert resposta.json()["erro"]["codigo"] == "sessao_expirada"


@pytest.mark.django_db
def test_renovar_pelo_corpo_como_o_app_mobile(api, usuario):
    renovacao = api.post(LOGIN, CREDENCIAIS, HTTP_X_CLIENTE="mobile").json()["renovacao"]
    cliente = APIClient(enforce_csrf_checks=True)

    resposta = cliente.post(RENOVAR, {"renovacao": renovacao})

    assert resposta.status_code == 200
    assert resposta.json()["acesso"]
    assert resposta.json()["renovacao"] != renovacao


@pytest.mark.django_db
def test_logout_apaga_cookie_e_invalida_o_token(navegador):
    token = navegador.cookies["rrapp_renovacao"].value

    resposta = navegador.post(LOGOUT)

    assert resposta.status_code == 204
    assert resposta.cookies["rrapp_renovacao"].value == ""
    navegador.cookies["rrapp_renovacao"] = token
    assert navegador.post(RENOVAR, HTTP_X_CSRFTOKEN=csrf(navegador)).status_code == 401


@pytest.mark.django_db
def test_encerrar_sessoes_invalida_todos_os_tokens(usuario, api):
    tokens = [
        api.post(LOGIN, CREDENCIAIS, HTTP_X_CLIENTE="mobile").json()["renovacao"] for _ in range(2)
    ]

    encerrar_sessoes(usuario)

    for token in tokens:
        assert api.post(RENOVAR, {"renovacao": token}).status_code == 401


@pytest.mark.django_db
def test_usuario_desativado_nao_renova(api, usuario):
    renovacao = api.post(LOGIN, CREDENCIAIS, HTTP_X_CLIENTE="mobile").json()["renovacao"]
    usuario.is_active = False
    usuario.save()

    assert api.post(RENOVAR, {"renovacao": renovacao}).status_code == 401
