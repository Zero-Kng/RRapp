import pytest

from factories import UsuarioFactory

CADASTRO = "/api/v1/auth/cadastro"
LOGIN = "/api/v1/auth/login"
EU = "/api/v1/auth/eu"


def dados_cadastro(**alteracoes):
    dados = {
        "username": "bia",
        "email": "bia@example.com",
        "senha": "uma-senha-bem-forte",
        "aceite_termos": True,
    }
    dados.update(alteracoes)
    return dados


@pytest.mark.django_db
def test_cadastro_cria_conta_e_ja_entra(api, settings):
    resposta = api.post(CADASTRO, dados_cadastro())

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["usuario"]["username"] == "bia"
    assert corpo["usuario"]["email"] == "bia@example.com"
    assert "senha" not in corpo["usuario"]
    assert corpo["acesso"]
    cookie = resposta.cookies["rrapp_renovacao"]
    assert cookie["httponly"] is True
    assert cookie["samesite"] == "Strict"
    assert cookie["path"] == "/api/v1/auth/"
    assert "renovacao" not in corpo

    from contas.models import Usuario

    usuario = Usuario.objects.get(username="bia")
    assert usuario.termos_versao == settings.TERMOS_VERSAO
    assert usuario.termos_aceitos_em is not None


@pytest.mark.django_db
def test_cadastro_normaliza_maiusculas(api):
    resposta = api.post(CADASTRO, dados_cadastro(username="Bia", email="Bia@Example.com"))

    assert resposta.status_code == 201
    assert resposta.json()["usuario"]["username"] == "bia"
    assert resposta.json()["usuario"]["email"] == "bia@example.com"


@pytest.mark.django_db
def test_cadastro_recusa_duplicados_ignorando_maiusculas(api, usuario):
    resposta = api.post(CADASTRO, dados_cadastro(username="ANA", email="ANA@example.com"))

    assert resposta.status_code == 400
    campos = resposta.json()["erro"]["campos"]
    assert "username" in campos
    assert "email" in campos


@pytest.mark.django_db
def test_cadastro_exige_aceite_dos_termos(api):
    resposta = api.post(CADASTRO, dados_cadastro(aceite_termos=False))

    assert resposta.status_code == 400
    assert "aceite_termos" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
def test_cadastro_recusa_senha_fraca(api):
    resposta = api.post(CADASTRO, dados_cadastro(senha="12345678"))

    assert resposta.status_code == 400
    assert "senha" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
@pytest.mark.parametrize("username", ["ab", "com espaço", "ç" * 5, "admin", "a" * 31])
def test_cadastro_recusa_username_invalido_ou_reservado(api, username):
    resposta = api.post(CADASTRO, dados_cadastro(username=username))

    assert resposta.status_code == 400
    assert "username" in resposta.json()["erro"]["campos"]


@pytest.mark.django_db
@pytest.mark.parametrize("login", ["ana", "ANA", "ana@example.com", "Ana@Example.COM"])
def test_login_por_username_ou_email_sem_diferenciar_maiusculas(api, usuario, login):
    resposta = api.post(LOGIN, {"login": login, "senha": "senha-forte-123"})

    assert resposta.status_code == 200
    assert resposta.json()["usuario"]["username"] == "ana"
    assert resposta.json()["acesso"]
    assert "rrapp_renovacao" in resposta.cookies
    assert "csrftoken" in resposta.cookies


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("login", "senha"), [("ana", "senha-errada"), ("ninguem", "senha-forte-123")]
)
def test_login_invalido_nao_revela_o_motivo(api, usuario, login, senha):
    resposta = api.post(LOGIN, {"login": login, "senha": senha})

    assert resposta.status_code == 401
    assert resposta.json()["erro"] == {
        "codigo": "credenciais_invalidas",
        "mensagem": "E-mail/usuário ou senha incorretos.",
        "campos": {},
    }


@pytest.mark.django_db
def test_usuario_desativado_nao_entra(api):
    UsuarioFactory(username="suspenso", is_active=False)

    resposta = api.post(LOGIN, {"login": "suspenso", "senha": "senha-forte-123"})

    assert resposta.status_code == 401


@pytest.mark.django_db
def test_login_mobile_devolve_renovacao_no_corpo(api, usuario):
    resposta = api.post(
        LOGIN, {"login": "ana", "senha": "senha-forte-123"}, HTTP_X_CLIENTE="mobile"
    )

    assert resposta.status_code == 200
    assert resposta.json()["renovacao"]
    assert "rrapp_renovacao" not in resposta.cookies


@pytest.mark.django_db
def test_eu_com_token_de_acesso(api, usuario):
    acesso = api.post(LOGIN, {"login": "ana", "senha": "senha-forte-123"}).json()["acesso"]

    resposta = api.get(EU, HTTP_AUTHORIZATION=f"Bearer {acesso}")

    assert resposta.status_code == 200
    assert resposta.json()["email"] == "ana@example.com"


@pytest.mark.django_db
def test_eu_sem_token_responde_401(api):
    resposta = api.get(EU)

    assert resposta.status_code == 401
    assert resposta.json()["erro"]["codigo"] == "nao_autenticado"


@pytest.mark.django_db
def test_login_e_limitado_por_ip(api, usuario):
    for _ in range(5):
        api.post(LOGIN, {"login": "ana", "senha": "errada"})

    resposta = api.post(LOGIN, {"login": "ana", "senha": "senha-forte-123"})

    assert resposta.status_code == 429
    assert resposta.json()["erro"]["codigo"] == "muitas_requisicoes"


@pytest.mark.django_db
def test_limite_de_login_nao_e_burlado_por_x_forwarded_for(api, usuario):
    for numero in range(5):
        api.post(
            LOGIN, {"login": "ana", "senha": "errada"}, HTTP_X_FORWARDED_FOR=f"10.0.0.{numero}"
        )

    resposta = api.post(
        LOGIN, {"login": "ana", "senha": "senha-forte-123"}, HTTP_X_FORWARDED_FOR="10.0.0.99"
    )

    assert resposta.status_code == 429
