import re

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from contas.models import Usuario
from lugares.serializers import CidadeSerializer

PADRAO_USERNAME = re.compile(r"[a-z0-9_.]{3,30}")
USERNAMES_RESERVADOS = {"admin", "api", "eu", "rrapp", "suporte", "configuracoes"}


class EuSerializer(serializers.ModelSerializer):
    cidade = CidadeSerializer(read_only=True)
    membro_desde = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = Usuario
        fields = ["username", "email", "nome_exibicao", "bio", "avatar", "cidade", "membro_desde"]
        read_only_fields = fields


class CadastroSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30)
    email = serializers.EmailField(max_length=254)
    senha = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    aceite_termos = serializers.BooleanField()

    def validate_username(self, valor: str) -> str:
        valor = valor.strip().lower()
        if not PADRAO_USERNAME.fullmatch(valor):
            raise serializers.ValidationError(
                "Use de 3 a 30 caracteres: letras minúsculas sem acento, números, _ ou ."
            )
        if valor in USERNAMES_RESERVADOS:
            raise serializers.ValidationError("Este nome de usuário não está disponível.")
        if Usuario.objects.filter(username__iexact=valor).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return valor

    def validate_email(self, valor: str) -> str:
        valor = valor.strip().lower()
        if Usuario.objects.filter(email__iexact=valor).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return valor

    def validate_aceite_termos(self, valor: bool) -> bool:
        if not valor:
            raise serializers.ValidationError(
                "É preciso aceitar os termos de uso e a política de privacidade."
            )
        return valor

    def validate(self, dados: dict) -> dict:
        provisorio = Usuario(username=dados["username"], email=dados["email"])
        try:
            validate_password(dados["senha"], user=provisorio)
        except DjangoValidationError as erro:
            raise serializers.ValidationError({"senha": list(erro.messages)}) from erro
        return dados

    def create(self, dados: dict) -> Usuario:
        return Usuario.objects.create_user(
            username=dados["username"],
            email=dados["email"],
            password=dados["senha"],
            termos_versao=settings.TERMOS_VERSAO,
            termos_aceitos_em=timezone.now(),
        )


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=254)
    senha = serializers.CharField(trim_whitespace=False, max_length=128)


class SessaoSerializer(serializers.Serializer):
    """Só para documentar a resposta de cadastro/login no OpenAPI."""

    usuario = EuSerializer()
    acesso = serializers.CharField()
    renovacao = serializers.CharField(required=False, help_text="Só com `X-Cliente: mobile`.")


def validar_nova_senha(senha: str, usuario: Usuario, campo: str = "nova_senha") -> None:
    try:
        validate_password(senha, user=usuario)
    except DjangoValidationError as erro:
        raise serializers.ValidationError({campo: list(erro.messages)}) from erro


class EsqueciSenhaSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class RedefinirSenhaSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=64)
    token = serializers.CharField(max_length=128)
    nova_senha = serializers.CharField(trim_whitespace=False, max_length=128)


class TrocarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(trim_whitespace=False, max_length=128)
    nova_senha = serializers.CharField(trim_whitespace=False, max_length=128)


class MensagemSerializer(serializers.Serializer):
    mensagem = serializers.CharField()
