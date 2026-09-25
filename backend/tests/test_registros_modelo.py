import datetime
from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from factories import RegistroFactory, RestauranteFactory, UsuarioFactory
from registros.estatisticas import numeros_do_usuario
from registros.notas import histograma


def dia(numero):
    return datetime.date(2026, 9, numero)


@pytest.mark.django_db
def test_media_usa_so_a_nota_mais_recente_de_cada_usuario():
    restaurante = RestauranteFactory()
    ana, bia = UsuarioFactory(), UsuarioFactory()
    RegistroFactory(usuario=ana, restaurante=restaurante, nota=2, data_visita=dia(1))
    RegistroFactory(usuario=ana, restaurante=restaurante, nota=8, data_visita=dia(10))
    RegistroFactory(usuario=bia, restaurante=restaurante, nota=9, data_visita=dia(5))

    restaurante.refresh_from_db()

    assert restaurante.nota_media == Decimal("4.25")  # (8 + 9) / 2 meias estrelas
    assert restaurante.total_avaliacoes == 2


@pytest.mark.django_db
def test_registro_sem_nota_nao_conta_nem_apaga_a_nota_anterior():
    restaurante = RestauranteFactory()
    ana = UsuarioFactory()
    RegistroFactory(usuario=ana, restaurante=restaurante, nota=6, data_visita=dia(1))
    RegistroFactory(usuario=ana, restaurante=restaurante, nota=None, data_visita=dia(9))

    restaurante.refresh_from_db()

    assert restaurante.nota_media == Decimal("3.00")
    assert restaurante.total_avaliacoes == 1


@pytest.mark.django_db
def test_media_arredonda_para_duas_casas():
    restaurante = RestauranteFactory()
    for nota in (7, 7, 8):
        RegistroFactory(restaurante=restaurante, nota=nota)

    restaurante.refresh_from_db()

    assert restaurante.nota_media == Decimal("3.67")


@pytest.mark.django_db
def test_media_e_recalculada_ao_editar_e_apagar():
    registro = RegistroFactory(nota=10)
    restaurante = registro.restaurante

    registro.nota = 4
    registro.save()
    restaurante.refresh_from_db()
    assert restaurante.nota_media == Decimal("2.00")

    registro.delete()
    restaurante.refresh_from_db()
    assert restaurante.nota_media is None
    assert restaurante.total_avaliacoes == 0


@pytest.mark.django_db
def test_histograma_tem_onze_faixas():
    restaurante = RestauranteFactory()
    RegistroFactory(restaurante=restaurante, nota=7)
    RegistroFactory(restaurante=restaurante, nota=7)
    RegistroFactory(restaurante=restaurante, nota=0)

    barras = histograma(restaurante.id)

    assert len(barras) == 11
    assert barras[0] == {"nota": 0.0, "quantidade": 1}
    assert barras[7] == {"nota": 3.5, "quantidade": 2}
    assert sum(barra["quantidade"] for barra in barras) == 3


@pytest.mark.django_db
def test_banco_recusa_nota_acima_de_10():
    with pytest.raises(IntegrityError), transaction.atomic():
        RegistroFactory(nota=11)


@pytest.mark.django_db
def test_restaurante_com_registros_nao_pode_ser_apagado():
    registro = RegistroFactory()

    with pytest.raises(ProtectedError):
        registro.restaurante.delete()


@pytest.mark.django_db
def test_numeros_do_usuario():
    ana = UsuarioFactory()
    bar, cantina = RestauranteFactory(), RestauranteFactory()
    RegistroFactory(usuario=ana, restaurante=bar, data_visita=datetime.date(2025, 5, 1))
    RegistroFactory(usuario=ana, restaurante=bar, data_visita=datetime.date(2026, 1, 2))
    RegistroFactory(usuario=ana, restaurante=cantina, data_visita=datetime.date(2025, 3, 3))

    numeros = numeros_do_usuario(ana, hoje=datetime.date(2026, 9, 25))

    assert numeros == {"visitados": 2, "visitados_este_ano": 1}
