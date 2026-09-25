import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def carregar_settings(**variaveis):
    """Carrega as settings num processo separado, com as variáveis de ambiente dadas."""
    ambiente = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", **variaveis}
    return subprocess.run(  # noqa: S603
        [sys.executable, "-c", "from django.conf import settings; settings.ADMIN_URL"],
        cwd=BACKEND,
        env=ambiente,
        capture_output=True,
        text=True,
        check=False,
    )


def test_producao_exige_admin_url():
    resultado = carregar_settings(DEBUG="False", ADMIN_URL="")

    assert resultado.returncode != 0
    assert "ADMIN_URL" in resultado.stderr


def test_admin_url_precisa_terminar_com_barra():
    resultado = carregar_settings(DEBUG="True", ADMIN_URL="painel")

    assert resultado.returncode != 0
    assert "ADMIN_URL" in resultado.stderr


def test_producao_aceita_admin_url_valida():
    resultado = carregar_settings(DEBUG="False", ADMIN_URL="painel-secreto/")

    assert resultado.returncode == 0, resultado.stderr


def test_producao_exige_2fa_no_admin():
    resultado = carregar_settings(
        DEBUG="False", ADMIN_URL="painel-secreto/", ADMIN_EXIGIR_2FA="False"
    )

    assert resultado.returncode != 0
    assert "2FA" in resultado.stderr
