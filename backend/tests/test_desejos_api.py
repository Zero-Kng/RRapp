import pytest

from colecoes.models import Desejo
from config.api import ThrottleEscrita
from factories import DesejoFactory, RegistroFactory, RestauranteFactory
from lugares.models import Restaurante

URL = "/api/v1/eu/desejos/{}"


def nomes(resposta):
    return [item["restaurante"]["nome"] for item in resposta.json()["results"]]


@pytest.mark.django_db
def test_anonimo_nao_guarda_desejo(api):
    assert api.put(URL.format(RestauranteFactory().slug)).status_code == 401


@pytest.mark.django_db
def test_anonimo_nao_tira_desejo(api):
    assert api.delete(URL.format(DesejoFactory().restaurante.slug)).status_code == 401


@pytest.mark.django_db
def test_guardar_desejo_e_idempotente(api_logado, usuario):
    restaurante = RestauranteFactory()

    assert api_logado.put(URL.format(restaurante.slug)).status_code == 204
    assert api_logado.put(URL.format(restaurante.slug)).status_code == 204

    assert Desejo.objects.filter(usuario=usuario, restaurante=restaurante).count() == 1


@pytest.mark.django_db
def test_tirar_desejo_e_idempotente(api_logado, usuario):
    desejo = DesejoFactory(usuario=usuario)
    outro = DesejoFactory(restaurante=desejo.restaurante)  # de outra pessoa

    assert api_logado.delete(URL.format(desejo.restaurante.slug)).status_code == 204
    assert api_logado.delete(URL.format(desejo.restaurante.slug)).status_code == 204

    assert list(Desejo.objects.all()) == [outro]


@pytest.mark.django_db
@pytest.mark.parametrize("slug", ["nao-existe", "pendente"])
def test_restaurante_inexistente_ou_pendente(api_logado, slug):
    RestauranteFactory(slug="pendente", status=Restaurante.Status.PENDENTE)

    assert api_logado.put(URL.format(slug)).status_code == 404
    assert not Desejo.objects.exists()


@pytest.mark.django_db
def test_guardar_de_novo_depois_de_ter_ido(api_logado, usuario):
    registro = RegistroFactory(usuario=usuario)

    assert api_logado.put(URL.format(registro.restaurante.slug)).status_code == 204

    assert Desejo.objects.filter(usuario=usuario, restaurante=registro.restaurante).exists()


@pytest.mark.django_db
def test_lista_publica_do_perfil_mais_recentes_primeiro(api, usuario):
    velho = DesejoFactory(usuario=usuario)
    novo = DesejoFactory(usuario=usuario)
    DesejoFactory()  # de outra pessoa

    resposta = api.get("/api/v1/usuarios/ana/desejos")

    assert resposta.status_code == 200
    assert nomes(resposta) == [novo.restaurante.nome, velho.restaurante.nome]
    assert set(resposta.json()["results"][0]) == {"restaurante", "adicionado_em"}


@pytest.mark.django_db
def test_ordem_por_bairro_e_nome_com_sem_bairro_no_fim(api, usuario):
    for nome, bairro in [
        ("Zé", "Botafogo"),
        ("Adega", "Tijuca"),
        ("Bar", ""),
        ("Aprazível", "Botafogo"),
    ]:
        DesejoFactory(usuario=usuario, restaurante=RestauranteFactory(nome=nome, bairro=bairro))

    resposta = api.get("/api/v1/usuarios/ana/desejos", {"ordem": "bairro"})

    assert nomes(resposta) == ["Aprazível", "Zé", "Adega", "Bar"]


@pytest.mark.django_db
def test_ordem_invalida(api, usuario):
    assert api.get("/api/v1/usuarios/ana/desejos", {"ordem": "nota"}).status_code == 400


@pytest.mark.django_db
def test_username_ignora_caixa(api, usuario):
    DesejoFactory(usuario=usuario)

    assert api.get("/api/v1/usuarios/ANA/desejos").json()["count"] == 1


@pytest.mark.django_db
def test_desejos_de_usuario_suspenso_ou_inexistente(api, usuario):
    usuario.is_active = False
    usuario.save()

    assert api.get("/api/v1/usuarios/ana/desejos").status_code == 404
    assert api.get("/api/v1/usuarios/ninguem/desejos").status_code == 404


@pytest.mark.django_db
def test_escrita_de_desejo_e_limitada_mas_leitura_nao(api_logado, usuario, monkeypatch):
    monkeypatch.setattr(ThrottleEscrita, "THROTTLE_RATES", {"escrita": "2/min"})
    restaurante = RestauranteFactory()

    codigos = [api_logado.put(URL.format(restaurante.slug)).status_code for _ in range(3)]

    assert codigos == [204, 204, 429]
    assert api_logado.get("/api/v1/usuarios/ana/desejos").status_code == 200
