from django.contrib.auth.models import update_last_login
from django.db.models import Q
from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.api import ErroApi
from contas.autenticacao import emitir_sessao
from contas.models import Usuario
from contas.serializers import CadastroSerializer, EuSerializer, LoginSerializer, SessaoSerializer

MENSAGEM_CREDENCIAIS = "E-mail/usuário ou senha incorretos."


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
