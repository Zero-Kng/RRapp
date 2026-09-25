from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice

from factories import UsuarioFactory


@pytest.mark.django_db
def test_admin_sem_segundo_fator_volta_para_o_login(client, settings):
    admin = UsuarioFactory(is_staff=True, is_superuser=True)
    client.force_login(admin)

    resposta = client.get(f"/{settings.ADMIN_URL}")

    assert resposta.status_code == 302
    assert "login" in resposta["Location"]


@pytest.mark.django_db
def test_tela_de_login_do_admin_pede_o_codigo(client, settings):
    resposta = client.get(f"/{settings.ADMIN_URL}login/")

    assert 'name="otp_token"' in resposta.content.decode()


@pytest.mark.django_db
def test_admin_com_segundo_fator_entra(admin_logado, settings):
    assert admin_logado.get(f"/{settings.ADMIN_URL}").status_code == 200


@pytest.mark.django_db
def test_configurar_2fa_cria_autenticador_e_mostra_o_endereco():
    admin = UsuarioFactory(username="chefe", is_staff=True)
    saida = StringIO()

    call_command("configurar_2fa", "CHEFE", stdout=saida)

    dispositivo = TOTPDevice.objects.get(user=admin)
    assert dispositivo.confirmed
    assert "otpauth://totp/" in saida.getvalue()


@pytest.mark.django_db
def test_configurar_2fa_nao_substitui_sem_recriar():
    admin = UsuarioFactory(username="chefe", is_staff=True)
    call_command("configurar_2fa", "chefe", stdout=StringIO())

    with pytest.raises(CommandError, match="--recriar"):
        call_command("configurar_2fa", "chefe", stdout=StringIO())

    call_command("configurar_2fa", "chefe", "--recriar", stdout=StringIO())
    assert TOTPDevice.objects.filter(user=admin).count() == 1


@pytest.mark.django_db
def test_configurar_2fa_so_para_staff():
    UsuarioFactory(username="comum")

    with pytest.raises(CommandError, match="não encontrado"):
        call_command("configurar_2fa", "comum", stdout=StringIO())
