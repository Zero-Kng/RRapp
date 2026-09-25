from django.contrib.auth.models import update_last_login
from django.db.models import Q
from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from config.api import ErroApi
from contas.autenticacao import (
    COOKIE_RENOVACAO,
    apagar_cookie,
    definir_cookie,
    emitir_sessao,
    exigir_csrf,
)
from contas.models import Usuario
from contas.serializers import CadastroSerializer, EuSerializer, LoginSerializer, SessaoSerializer

MENSAGEM_CREDENCIAIS = "E-mail/usuário ou senha incorretos."
MENSAGEM_SESSAO = "Sua sessão expirou. Entre novamente."


def _resposta_de_sessao(request, usuario, status_http=status.HTTP_200_OK) -> Response:
    resposta = Response(
        {"usuario": EuSerializer(usuario, context={"request": request}).data}, status=status_http
    )
    emitir_sessao(resposta, usuario, request)
    get_token(request._request)  # garante o cookie csrftoken para a renovação
    return resposta


class CadastroView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "cadastro"

    @extend_schema(request=CadastroSerializer, responses={201: SessaoSerializer})
    def post(self, request):
        serializer = CadastroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return _resposta_de_sessao(request, usuario, status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: SessaoSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        termo = serializer.validated_data["login"].strip()
        senha = serializer.validated_data["senha"]
        usuario = Usuario.objects.filter(Q(username__iexact=termo) | Q(email__iexact=termo)).first()
        if usuario is None:
            Usuario().set_password(senha)  # mesmo custo de tempo: não revela se a conta existe
            raise ErroApi("credenciais_invalidas", MENSAGEM_CREDENCIAIS, status=401)
        if not usuario.is_active or not usuario.check_password(senha):
            raise ErroApi("credenciais_invalidas", MENSAGEM_CREDENCIAIS, status=401)
        update_last_login(None, usuario)
        return _resposta_de_sessao(request, usuario)


class EuView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: EuSerializer})
    def get(self, request):
        return Response(EuSerializer(request.user, context={"request": request}).data)


def _token_do_corpo(request) -> str | None:
    return request.data.get("renovacao") if isinstance(request.data, dict) else None


class RenovacaoSerializer(serializers.Serializer):
    renovacao = serializers.CharField(required=False, help_text="Só para o app mobile.")


class AcessoSerializer(serializers.Serializer):
    acesso = serializers.CharField()
    renovacao = serializers.CharField(required=False)


class RenovarTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=RenovacaoSerializer, responses={200: AcessoSerializer})
    def post(self, request):
        token = _token_do_corpo(request)
        via_cookie = token is None
        if via_cookie:
            token = request.COOKIES.get(COOKIE_RENOVACAO)
            if not token:
                raise ErroApi("sessao_expirada", MENSAGEM_SESSAO, status=401)
            exigir_csrf(request._request)

        serializer = TokenRefreshSerializer(data={"refresh": token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken, AuthenticationFailed, ValidationError) as erro:
            raise ErroApi("sessao_expirada", MENSAGEM_SESSAO, status=401) from erro

        novos = serializer.validated_data
        resposta = Response({"acesso": novos["access"]})
        if via_cookie:
            definir_cookie(resposta, novos["refresh"])
        else:
            resposta.data["renovacao"] = novos["refresh"]
        return resposta


class LogoutView(APIView):
    """Sem CSRF de propósito: o pior que um site malicioso consegue é deslogar alguém."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=RenovacaoSerializer, responses={204: None})
    def post(self, request):
        token = _token_do_corpo(request) or request.COOKIES.get(COOKIE_RENOVACAO)
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass  # token já inválido: nada a fazer
        resposta = Response(status=status.HTTP_204_NO_CONTENT)
        apagar_cookie(resposta)
        return resposta
