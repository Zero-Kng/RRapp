from pathlib import Path

import pytest
from django.core.management import call_command

OPCIONAIS = {("Sessao", "renovacao"), ("Acesso", "renovacao")}


@pytest.fixture
def esquema(api):
    return api.get("/api/schema", {"format": "json"}).json()


def normalizar(caminho: Path) -> str:
    return caminho.read_text(encoding="utf-8").replace("\r\n", "\n")


@pytest.mark.django_db
def test_campos_de_resposta_sao_obrigatorios(esquema):
    registro = esquema["components"]["schemas"]["Registro"]
    assert {"nota", "critica", "data_visita", "curtiu", "revisita", "restaurante"} <= set(
        registro["required"]
    )


@pytest.mark.django_db
def test_renovacao_continua_opcional(esquema):
    for componente, campo in OPCIONAIS:
        assert campo not in esquema["components"]["schemas"][componente].get("required", [])


@pytest.mark.django_db
def test_requisicoes_parciais_continuam_opcionais(esquema):
    patch = esquema["components"]["schemas"]["PatchedRegistroRequest"]
    assert "nota" not in patch.get("required", [])


@pytest.mark.django_db
def test_avatar_pode_ser_nulo(esquema):
    for componente in ("Eu", "PerfilPublico", "UsuarioResumo"):
        assert esquema["components"]["schemas"][componente]["properties"]["avatar"]["nullable"]


@pytest.mark.django_db
def test_toda_operacao_documenta_o_formato_de_erro(esquema):
    erro = esquema["components"]["schemas"]["Erro"]
    assert erro["properties"]["erro"]["required"] == ["codigo", "mensagem", "campos"]
    for caminho, operacoes in esquema["paths"].items():
        for metodo, operacao in operacoes.items():
            referencia = operacao["responses"]["default"]["content"]["application/json"]
            assert referencia["schema"]["$ref"] == "#/components/schemas/Erro", (caminho, metodo)


@pytest.mark.django_db
def test_arquivo_openapi_versionado_esta_atualizado(tmp_path):
    gerado = tmp_path / "openapi.yml"
    call_command("spectacular", "--file", str(gerado))
    versionado = Path(__file__).resolve().parent.parent / "openapi.yml"

    assert versionado.exists(), "Rode: python manage.py spectacular --file openapi.yml"
    assert normalizar(versionado) == normalizar(gerado), (
        "openapi.yml desatualizado. Rode: python manage.py spectacular --file openapi.yml"
    )
