import pytest
from django.db import IntegrityError, transaction

from factories import UsuarioFactory


@pytest.mark.django_db
def test_username_e_unico_sem_diferenciar_maiusculas():
    UsuarioFactory(username="ana")
    with pytest.raises(IntegrityError), transaction.atomic():
        UsuarioFactory(username="ANA")


@pytest.mark.django_db
def test_email_e_unico_sem_diferenciar_maiusculas():
    UsuarioFactory(email="ana@example.com")
    with pytest.raises(IntegrityError), transaction.atomic():
        UsuarioFactory(email="Ana@Example.com")


@pytest.mark.django_db
def test_campos_de_perfil_comecam_vazios():
    usuario = UsuarioFactory()

    assert usuario.nome_exibicao == ""
    assert usuario.bio == ""
    assert not usuario.avatar
    assert usuario.cidade is None
    assert usuario.termos_aceitos_em is None


@pytest.mark.django_db
def test_factory_cria_senha_utilizavel():
    assert UsuarioFactory().check_password("senha-forte-123")
