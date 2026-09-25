import pytest

from factories import RestauranteFactory
from lugares.models import Restaurante
from lugares.slugs import gerar_slug_unico


@pytest.mark.django_db
def test_slug_simples():
    assert gerar_slug_unico(Restaurante, "Bar do Mineiro Santa Teresa") == (
        "bar-do-mineiro-santa-teresa"
    )


@pytest.mark.django_db
def test_slug_remove_acentos():
    assert gerar_slug_unico(Restaurante, "Feijoáda Café São João") == "feijoada-cafe-sao-joao"


@pytest.mark.django_db
def test_slug_repetido_ganha_sufixo_numerico():
    RestauranteFactory(slug="bar-do-ze-botafogo")
    RestauranteFactory(slug="bar-do-ze-botafogo-2")

    assert gerar_slug_unico(Restaurante, "Bar do Zé Botafogo") == "bar-do-ze-botafogo-3"


@pytest.mark.django_db
def test_texto_sem_letras_latinas_usa_reserva():
    assert gerar_slug_unico(Restaurante, "日本料理") == "restaurante"
    assert gerar_slug_unico(Restaurante, "!!!", reserva="categoria") == "categoria"


@pytest.mark.django_db
def test_reserva_repetida_tambem_ganha_sufixo():
    RestauranteFactory(slug="restaurante")

    assert gerar_slug_unico(Restaurante, "日本料理") == "restaurante-2"


@pytest.mark.django_db
def test_slug_respeita_tamanho_maximo_mesmo_com_sufixo():
    primeiro = gerar_slug_unico(Restaurante, "a" * 300, max_length=20)
    RestauranteFactory(slug=primeiro)
    segundo = gerar_slug_unico(Restaurante, "a" * 300, max_length=20)

    assert primeiro == "a" * 20
    assert segundo == "a" * 18 + "-2"
