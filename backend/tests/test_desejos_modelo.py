import pytest
from django.db import IntegrityError

from colecoes.models import Desejo
from factories import DesejoFactory, RegistroFactory


@pytest.mark.django_db
def test_desejo_e_unico_por_usuario_e_restaurante():
    desejo = DesejoFactory()
    with pytest.raises(IntegrityError):
        DesejoFactory(usuario=desejo.usuario, restaurante=desejo.restaurante)


@pytest.mark.django_db
def test_criar_registro_tira_o_restaurante_dos_desejos_do_autor():
    desejo = DesejoFactory()

    RegistroFactory(usuario=desejo.usuario, restaurante=desejo.restaurante)

    assert not Desejo.objects.filter(pk=desejo.pk).exists()


@pytest.mark.django_db
def test_registro_de_outra_pessoa_nao_mexe_no_meu_desejo():
    desejo = DesejoFactory()

    RegistroFactory(restaurante=desejo.restaurante)  # outro usuário

    assert Desejo.objects.filter(pk=desejo.pk).exists()


@pytest.mark.django_db
def test_editar_registro_existente_nao_tira_desejo_guardado_depois():
    registro = RegistroFactory()
    desejo = DesejoFactory(usuario=registro.usuario, restaurante=registro.restaurante)

    registro.critica = "Voltaria"
    registro.save()

    assert Desejo.objects.filter(pk=desejo.pk).exists()


@pytest.mark.django_db
def test_excluir_usuario_apaga_os_desejos():
    desejo = DesejoFactory()

    desejo.usuario.delete()

    assert not Desejo.objects.exists()


@pytest.mark.django_db
def test_apagar_restaurante_apaga_os_desejos():
    desejo = DesejoFactory()

    desejo.restaurante.delete()

    assert not Desejo.objects.exists()
