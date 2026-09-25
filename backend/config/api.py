"""Peças compartilhadas da API: formato de erro e limites de requisição."""

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions
from rest_framework.permissions import SAFE_METHODS
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import exception_handler

# Códigos do DRF/simplejwt traduzidos para os códigos do rrapp
CODIGOS = {
    "not_authenticated": "nao_autenticado",
    "authentication_failed": "nao_autenticado",
    "token_not_valid": "nao_autenticado",
    "permission_denied": "sem_permissao",
    "not_found": "nao_encontrado",
    "method_not_allowed": "metodo_nao_permitido",
    "throttled": "muitas_requisicoes",
    "parse_error": "json_invalido",
    "unsupported_media_type": "formato_nao_suportado",
    "not_acceptable": "formato_nao_aceito",
}


class ErroApi(exceptions.APIException):
    """Erro de regra de negócio com código próprio (ex.: credenciais_invalidas)."""

    def __init__(self, codigo: str, mensagem: str, status: int = 400) -> None:
        self.status_code = status
        super().__init__(detail=mensagem, code=codigo)


def _codigo(exc: Exception) -> str:
    if isinstance(exc, Http404):
        return "nao_encontrado"
    if isinstance(exc, DjangoPermissionDenied):
        return "sem_permissao"
    codigo = exc.get_codes() if isinstance(exc, exceptions.APIException) else None
    if not isinstance(codigo, str):
        codigo = getattr(exc, "default_code", "erro")
    return CODIGOS.get(codigo, codigo)


def tratar_excecao(exc, context):
    resposta = exception_handler(exc, context)
    if resposta is None:
        return None  # erro inesperado: o Django responde 500 e o Sentry registra
    if isinstance(exc, exceptions.ValidationError):
        campos = resposta.data if isinstance(resposta.data, dict) else {"geral": resposta.data}
        erro = {"codigo": "dados_invalidos", "mensagem": "Dados inválidos.", "campos": campos}
    else:
        dados = resposta.data
        mensagem = dados.get("detail", "") if isinstance(dados, dict) else dados
        erro = {"codigo": _codigo(exc), "mensagem": str(mensagem), "campos": {}}
    resposta.data = {"erro": erro}
    return resposta


class ThrottleEscrita(ScopedRateThrottle):
    """Limita só requisições que escrevem (POST/PATCH/DELETE); leituras passam livres."""

    def allow_request(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return super().allow_request(request, view)
