import pytest
from django.db import IntegrityError, transaction

from factories import CategoriaFactory, RestauranteFactory
from lugares.models import Restaurante


@pytest.mark.django_db
def test_restaurante_nasce_ativo_e_sem_avaliacoes():
    restaurante = RestauranteFactory(nome="Bar do Zé", bairro="Botafogo")

    assert restaurante.status == Restaurante.Status.ATIVO
    assert restaurante.total_avaliacoes == 0
    assert restaurante.nota_media is None
    assert restaurante.bloquear_importacao is False
    assert str(restaurante) == "Bar do Zé (Botafogo)"


@pytest.mark.django_db
def test_str_sem_bairro_mostra_so_o_nome():
    assert str(RestauranteFactory(nome="Bar do Zé", bairro="")) == "Bar do Zé"


@pytest.mark.django_db
def test_fonte_e_id_externo_sao_unicos_juntos():
    RestauranteFactory(fonte="fsq_os", id_externo="abc")
    with pytest.raises(IntegrityError), transaction.atomic():
        RestauranteFactory(fonte="fsq_os", id_externo="abc")


@pytest.mark.django_db
def test_varios_restaurantes_sem_id_externo_sao_permitidos():
    RestauranteFactory(fonte="", id_externo="")
    RestauranteFactory(fonte="", id_externo="")

    assert Restaurante.objects.count() == 2


@pytest.mark.django_db
def test_faixa_de_preco_fora_de_1_a_4_e_rejeitada_pelo_banco():
    with pytest.raises(IntegrityError), transaction.atomic():
        RestauranteFactory(faixa_preco=5)


@pytest.mark.django_db
def test_restaurante_tem_varias_categorias():
    restaurante = RestauranteFactory()
    japones, bar = CategoriaFactory(nome="Japonês"), CategoriaFactory(nome="Bar")

    restaurante.categorias.add(japones, bar)

    assert set(japones.restaurantes.all()) == {restaurante}
    assert restaurante.categorias.count() == 2
