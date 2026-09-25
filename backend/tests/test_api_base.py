import pytest
from rest_framework import serializers
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from config.api import ErroApi


class ViewComErroDeNegocio(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        raise ErroApi("teste", "Mensagem de teste.", status=409)


class ViewComErroDeValidacao(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        raise serializers.ValidationError({"nota": ["inválida"]})


def test_erro_de_negocio_usa_formato_padrao():
    resposta = ViewComErroDeNegocio.as_view()(APIRequestFactory().get("/"))

    assert resposta.status_code == 409
    assert resposta.data == {
        "erro": {"codigo": "teste", "mensagem": "Mensagem de teste.", "campos": {}}
    }


def test_erro_de_validacao_lista_os_campos():
    resposta = ViewComErroDeValidacao.as_view()(APIRequestFactory().get("/"))

    assert resposta.status_code == 400
    assert resposta.data == {
        "erro": {
            "codigo": "dados_invalidos",
            "mensagem": "Dados inválidos.",
            "campos": {"nota": ["inválida"]},
        }
    }


def test_rota_inexistente_da_api_responde_json(api):
    resposta = api.get("/api/v1/nao-existe")

    assert resposta.status_code == 404
    assert resposta.json() == {
        "erro": {"codigo": "nao_encontrado", "mensagem": "Recurso não encontrado.", "campos": {}}
    }


def test_rota_inexistente_fora_da_api_continua_html(client):
    resposta = client.get("/qualquer-coisa")

    assert resposta.status_code == 404
    assert "application/json" not in resposta["Content-Type"]


@pytest.mark.django_db
def test_esquema_openapi_disponivel(api):
    resposta = api.get("/api/schema")

    assert resposta.status_code == 200
    assert b"openapi" in resposta.content


def test_pagina_de_documentacao_disponivel(api):
    assert api.get("/api/docs").status_code == 200


def test_cors_libera_o_frontend(api):
    resposta = api.get("/api/v1/saude", HTTP_ORIGIN="http://localhost:5173")

    assert resposta["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert resposta["Access-Control-Allow-Credentials"] == "true"


def test_cors_nao_libera_origem_desconhecida(api):
    resposta = api.get("/api/v1/saude", HTTP_ORIGIN="https://site-malicioso.com")

    assert "Access-Control-Allow-Origin" not in resposta


def test_cabecalho_csp_presente(api):
    politica = api.get("/api/v1/saude")["Content-Security-Policy"]

    assert "default-src 'self'" in politica
    assert "frame-ancestors 'none'" in politica
