import os

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from factories import FotoRegistroFactory, RegistroFactory, UsuarioFactory


def caminhos(foto) -> list[str]:
    return [foto.imagem.path, foto.miniatura.path]


def existem(arquivos: list[str]) -> list[bool]:
    return [os.path.exists(caminho) for caminho in arquivos]


@pytest.mark.django_db
def test_apagar_foto_apaga_os_dois_arquivos(midia_temporaria):
    foto = FotoRegistroFactory()
    arquivos = caminhos(foto)
    assert existem(arquivos) == [True, True]

    foto.delete()

    assert existem(arquivos) == [False, False]


@pytest.mark.django_db
def test_apagar_registro_apaga_os_arquivos_das_fotos(midia_temporaria):
    foto = FotoRegistroFactory()
    arquivos = caminhos(foto)

    foto.registro.delete()

    assert existem(arquivos) == [False, False]


@pytest.mark.django_db
def test_excluir_conta_apaga_os_arquivos_das_fotos(api_logado, usuario, midia_temporaria):
    arquivos = caminhos(FotoRegistroFactory(registro=RegistroFactory(usuario=usuario)))

    resposta = api_logado.post("/api/v1/eu/excluir", {"senha": "senha-forte-123"})

    assert resposta.status_code == 204
    assert existem(arquivos) == [False, False]


@pytest.mark.django_db
def test_registro_traz_as_fotos_na_ordem_do_envio(api, midia_temporaria):
    registro = RegistroFactory()
    primeira = FotoRegistroFactory(registro=registro)
    segunda = FotoRegistroFactory(registro=registro)

    fotos = api.get(f"/api/v1/registros/{registro.id}").json()["fotos"]

    assert [f["id"] for f in fotos] == [primeira.id, segunda.id]
    assert set(fotos[0]) == {"id", "imagem", "miniatura", "largura", "altura"}
    assert fotos[0]["miniatura"].startswith("http")


@pytest.mark.django_db
def test_diario_com_fotos_nao_faz_uma_consulta_por_registro(api, midia_temporaria):
    ana = UsuarioFactory(username="ana")

    def consultas_do_diario() -> int:
        with CaptureQueriesContext(connection) as contexto:
            assert api.get("/api/v1/usuarios/ana/diario").status_code == 200
        return len(contexto)

    FotoRegistroFactory(registro=RegistroFactory(usuario=ana))
    com_um = consultas_do_diario()
    for _ in range(2):
        registro = RegistroFactory(usuario=ana)
        FotoRegistroFactory(registro=registro)
        FotoRegistroFactory(registro=registro)

    assert consultas_do_diario() == com_um
