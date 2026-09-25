import datetime

import pytest

from lugares.importacao import FONTE_FSQ, importar_restaurantes
from lugares.models import Categoria, Restaurante


class LocalizadorFalso:
    def __init__(self, bairro="Botafogo"):
        self.bairro = bairro

    def bairro_de(self, latitude, longitude):
        return "" if latitude is None or longitude is None else self.bairro


def linha(**alteracoes):
    base = {
        "fsq_place_id": "fsq-1",
        "name": "Bar do Zé",
        "latitude": -22.951234567,
        "longitude": -43.187654321,
        "address": "Rua Voluntários da Pátria, 10",
        "date_closed": None,
        "fsq_category_ids": ["c_bar", "c_loja"],
        "fsq_category_labels": ["Dining and Drinking > Bar", "Retail > Loja"],
    }
    base.update(alteracoes)
    return base


@pytest.mark.django_db
def test_cria_restaurante_novo(rio):
    resultado = importar_restaurantes([linha()], rio, LocalizadorFalso())

    restaurante = Restaurante.objects.get()
    assert resultado.criados == 1
    assert restaurante.fonte == FONTE_FSQ
    assert restaurante.id_externo == "fsq-1"
    assert restaurante.slug == "bar-do-ze-botafogo"
    assert restaurante.bairro == "Botafogo"
    assert restaurante.cidade == rio
    assert restaurante.status == Restaurante.Status.ATIVO
    assert str(restaurante.latitude) == "-22.951235"


@pytest.mark.django_db
def test_so_categorias_de_gastronomia_sao_associadas(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())

    categoria = Restaurante.objects.get().categorias.get()
    assert categoria.fsq_id == "c_bar"
    assert categoria.nome == "Bar"
    assert categoria.nome_original == "Bar"
    assert Categoria.objects.count() == 1


@pytest.mark.django_db
def test_reimportar_atualiza_sem_duplicar_e_mantem_slug(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())

    resultado = importar_restaurantes([linha(name="Bar do Zé Novo")], rio, LocalizadorFalso())

    restaurante = Restaurante.objects.get()
    assert resultado.atualizados == 1
    assert resultado.criados == 0
    assert restaurante.nome == "Bar do Zé Novo"
    assert restaurante.slug == "bar-do-ze-botafogo"
    assert Categoria.objects.count() == 1


@pytest.mark.django_db
def test_linha_sem_nome_e_ignorada(rio):
    resultado = importar_restaurantes([linha(name="   "), linha(name=None)], rio)

    assert resultado.ignorados_sem_nome == 2
    assert not Restaurante.objects.exists()


@pytest.mark.django_db
def test_fora_da_cidade_e_ignorado_quando_ha_mapa_de_bairros(rio):
    resultado = importar_restaurantes([linha()], rio, LocalizadorFalso(bairro=""))

    assert resultado.ignorados_fora_da_cidade == 1
    assert not Restaurante.objects.exists()


@pytest.mark.django_db
def test_sem_coordenadas_e_sem_mapa_cria_sem_coordenadas(rio):
    importar_restaurantes([linha(latitude=None, longitude=None)], rio)

    restaurante = Restaurante.objects.get()
    assert restaurante.latitude is None
    assert restaurante.bairro == ""
    assert restaurante.slug == "bar-do-ze"


@pytest.mark.django_db
def test_sem_coordenadas_com_mapa_conta_como_fora_da_cidade(rio):
    resultado = importar_restaurantes([linha(latitude=None)], rio, LocalizadorFalso())

    assert resultado.ignorados_fora_da_cidade == 1


@pytest.mark.django_db
def test_novo_ja_fechado_nao_e_criado(rio):
    resultado = importar_restaurantes(
        [linha(date_closed=datetime.date(2025, 1, 1))], rio, LocalizadorFalso()
    )

    assert resultado.ignorados_ja_fechados == 1
    assert not Restaurante.objects.exists()


@pytest.mark.django_db
def test_existente_que_fechou_e_marcado_fechado(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())

    resultado = importar_restaurantes(
        [linha(date_closed=datetime.date(2026, 5, 1))], rio, LocalizadorFalso()
    )

    assert resultado.marcados_fechados == 1
    assert Restaurante.objects.get().status == Restaurante.Status.FECHADO


@pytest.mark.django_db
def test_fechado_pela_moderacao_nao_e_reaberto(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())
    Restaurante.objects.update(status=Restaurante.Status.FECHADO)

    importar_restaurantes([linha()], rio, LocalizadorFalso())

    assert Restaurante.objects.get().status == Restaurante.Status.FECHADO


@pytest.mark.django_db
def test_restaurante_bloqueado_nao_e_alterado(rio):
    importar_restaurantes([linha()], rio, LocalizadorFalso())
    Restaurante.objects.update(nome="Nome Corrigido", bloquear_importacao=True)

    resultado = importar_restaurantes([linha(name="Nome da Base")], rio, LocalizadorFalso())

    assert resultado.ignorados_bloqueados == 1
    assert Restaurante.objects.get().nome == "Nome Corrigido"


@pytest.mark.django_db
def test_textos_longos_sao_truncados(rio):
    importar_restaurantes([linha(name="B" * 300, address="R" * 400)], rio, LocalizadorFalso())

    restaurante = Restaurante.objects.get()
    assert len(restaurante.nome) == 200
    assert len(restaurante.endereco) == 255


@pytest.mark.django_db
def test_nomes_iguais_no_mesmo_bairro_ganham_slugs_diferentes(rio):
    importar_restaurantes(
        [linha(fsq_place_id="a"), linha(fsq_place_id="b")], rio, LocalizadorFalso()
    )

    assert set(Restaurante.objects.values_list("slug", flat=True)) == {
        "bar-do-ze-botafogo",
        "bar-do-ze-botafogo-2",
    }
