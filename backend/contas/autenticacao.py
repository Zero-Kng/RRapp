"""Emissão e encerramento de sessões JWT (acesso no corpo, renovação em cookie ou corpo)."""

from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken

COOKIE_RENOVACAO = "rrapp_renovacao"
CAMINHO_COOKIE = "/api/v1/auth/"


def cliente_mobile(request) -> bool:
    """O app mobile não usa cookies: pede os tokens no corpo com `X-Cliente: mobile`."""
    return request.headers.get("X-Cliente") == "mobile"


def definir_cookie(resposta, token: str) -> None:
    resposta.set_cookie(
        COOKIE_RENOVACAO,
        token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path=CAMINHO_COOKIE,
        secure=not settings.DEBUG,
        httponly=True,
        samesite="Strict",
    )


def apagar_cookie(resposta) -> None:
    resposta.delete_cookie(COOKIE_RENOVACAO, path=CAMINHO_COOKIE, samesite="Strict")


def emitir_sessao(resposta, usuario, request) -> None:
    """Acesso sempre no corpo; renovação no cookie (web) ou no corpo (mobile)."""
    renovacao = RefreshToken.for_user(usuario)
    resposta.data["acesso"] = str(renovacao.access_token)
    if cliente_mobile(request):
        resposta.data["renovacao"] = str(renovacao)
    else:
        definir_cookie(resposta, str(renovacao))


def exigir_csrf(request) -> None:
    """Verificação CSRF manual para rotas que usam o cookie (as views do DRF são isentas)."""
    verificador = CSRFCheck(lambda _requisicao: None)
    verificador.process_request(request)
    motivo = verificador.process_view(request, None, (), {})
    if motivo:
        raise PermissionDenied(f"Falha na verificação CSRF: {motivo}")
