import re

import pytest
from django.core import mail

ESQUECI = "/api/v1/auth/senha/esqueci"
REDEFINIR = "/api/v1/auth/senha/redefinir"
TROCAR = "/api/v1/eu/senha"
LOGIN = "/api/v1/auth/login"
RENOVAR = "/api/v1/auth/token/renovar"
MENSAGEM = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."


def link_do_email() -> tuple[str, str]:
    uid, token = re.search(r"uid=([^&\s]+)&token=(\S+)", mail.outbox[-1].body).groups()
    return uid, token


@pytest.mark.django_db
def test_esqueci_envia_link_para_o_frontend(api, usuario, settings):
    settings.FRONTEND_URL = "https://app.rrapp.com.br"

    resposta = api.post(ESQUECI, {"email": "ANA@example.com"})

    assert resposta.status_code == 202
    assert resposta.json() == {"mensagem": MENSAGEM}
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["ana@example.com"]
    assert "https://app.rrapp.com.br/redefinir-senha?uid=" in mail.outbox[0].body


@pytest.mark.django_db
def test_esqueci_com_email_desconhecido_responde_igual_e_nao_envia(api):
    resposta = api.post(ESQUECI, {"email": "ninguem@example.com"})

    assert resposta.status_code == 202
    assert resposta.json() == {"mensagem": MENSAGEM}
    assert mail.outbox == []


@pytest.mark.django_db
def test_redefinir_troca_a_senha_uma_unica_vez(api, usuario):
    api.post(ESQUECI, {"email": "ana@example.com"})
    uid, token = link_do_email()

    resposta = api.post(REDEFINIR, {"uid": uid, "token": token, "nova_senha": "outra-senha-forte"})
    repetida = api.post(REDEFINIR, {"uid": uid, "token": token, "nova_senha": "mais-uma-senha-x"})

    assert resposta.status_code == 204
    usuario.refresh_from_db()
    assert usuario.check_password("outra-senha-forte")
    assert repetida.status_code == 400
    assert repetida.json()["erro"]["codigo"] == "link_invalido"


@pytest.mark.django_db
def test_redefinir_encerra_as_sessoes(api, usuario):
    renovacao = api.post(
        LOGIN, {"login": "ana", "senha": "senha-forte-123"}, HTTP_X_CLIENTE="mobile"
    ).json()["renovacao"]
    api.post(ESQUECI, {"email": "ana@example.com"})
    uid, token = link_do_email()

    api.post(REDEFINIR, {"uid": uid, "token": token, "nova_senha": "outra-senha-forte"})

    assert api.post(RENOVAR, {"renovacao": renovacao}).status_code == 401


@pytest.mark.django_db
@pytest.mark.parametrize(("uid", "token"), [("xx", "yy"), ("MQ", "token-falso")])
def test_redefinir_com_link_invalido(api, usuario, uid, token):
    resposta = api.post(REDEFINIR, {"uid": uid, "token": token, "nova_senha": "outra-senha-forte"})

    assert resposta.status_code == 400
    assert resposta.json()["erro"]["codigo"] == "link_invalido"


@pytest.mark.django_db
def test_redefinir_recusa_senha_fraca(api, usuario):
    api.post(ESQUECI, {"email": "ana@example.com"})
    uid, token = link_do_email()

    resposta = api.post(REDEFINIR, {"uid": uid, "token": token, "nova_senha": "12345678"})

    assert resposta.status_code == 400
    assert "nova_senha" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_esqueci_e_limitado(api):
    for _ in range(5):
        api.post(ESQUECI, {"email": "x@example.com"})

    assert api.post(ESQUECI, {"email": "x@example.com"}).status_code == 429


@pytest.mark.django_db
def test_trocar_senha_exige_a_senha_atual(api_logado):
    resposta = api_logado.post(TROCAR, {"senha_atual": "errada", "nova_senha": "outra-senha-forte"})

    assert resposta.status_code == 400
    assert resposta.json()["erro"]["codigo"] == "senha_incorreta"


@pytest.mark.django_db
def test_trocar_senha_encerra_as_outras_sessoes_e_abre_uma_nova(api, usuario):
    antiga = api.post(
        LOGIN, {"login": "ana", "senha": "senha-forte-123"}, HTTP_X_CLIENTE="mobile"
    ).json()["renovacao"]
    api.force_authenticate(usuario)

    resposta = api.post(
        TROCAR, {"senha_atual": "senha-forte-123", "nova_senha": "outra-senha-forte"}
    )

    assert resposta.status_code == 200
    assert resposta.json()["acesso"]
    assert "rrapp_renovacao" in resposta.cookies
    usuario.refresh_from_db()
    assert usuario.check_password("outra-senha-forte")
    api.force_authenticate(None)
    assert api.post(RENOVAR, {"renovacao": antiga}).status_code == 401


@pytest.mark.django_db
def test_trocar_senha_sem_login(api):
    assert api.post(TROCAR, {"senha_atual": "a", "nova_senha": "b"}).status_code == 401


@pytest.mark.django_db
def test_trocar_senha_limita_tentativas(api_logado):
    codigos = [
        api_logado.post(
            TROCAR, {"senha_atual": "chute", "nova_senha": "outra-senha-forte"}
        ).status_code
        for _ in range(6)
    ]

    assert codigos == [400] * 5 + [429]
