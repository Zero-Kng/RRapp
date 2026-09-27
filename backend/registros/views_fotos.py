from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.api import ThrottleEscrita
from registros.fotos import processar_foto
from registros.models import MAXIMO_FOTOS_POR_REGISTRO, FotoRegistro, Registro
from registros.permissoes import EhDonoOuSomenteLeitura
from registros.serializers import FotoSerializer
from registros.views import registros_com_relacoes

MENSAGEM_LIMITE = f"Cada visita pode ter até {MAXIMO_FOTOS_POR_REGISTRO} fotos."


def registro_do_dono(request, pk: int) -> Registro:
    """Registro visível (404 se não existe ou é de suspenso); 403 se não é de quem pede."""
    registro = get_object_or_404(registros_com_relacoes(), pk=pk)
    if registro.usuario_id != request.user.id:
        raise PermissionDenied(EhDonoOuSomenteLeitura.message)
    return registro


class EnvioFotoSerializer(serializers.Serializer):
    imagem = serializers.FileField()


class FotosDoRegistroView(APIView):
    """Envia uma foto para uma visita (até 4). Cada envio é uma foto."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ThrottleEscrita]
    throttle_scope = "fotos"
    parser_classes = [MultiPartParser]

    @extend_schema(
        request={"multipart/form-data": EnvioFotoSerializer},
        responses={201: FotoSerializer},
    )
    def post(self, request, pk: int) -> Response:
        registro = registro_do_dono(request, pk)
        envio = EnvioFotoSerializer(data=request.data)
        envio.is_valid(raise_exception=True)
        try:
            foto = processar_foto(envio.validated_data["imagem"])
        except serializers.ValidationError as erro:
            raise serializers.ValidationError({"imagem": erro.detail}) from erro
        with transaction.atomic():
            # Trava o registro: dois envios ao mesmo tempo não passam do limite
            Registro.objects.select_for_update().filter(pk=registro.pk).first()
            # Conta no banco (não no cache do prefetch, lido antes da trava)
            if (
                FotoRegistro.objects.filter(registro_id=registro.pk).count()
                >= MAXIMO_FOTOS_POR_REGISTRO
            ):
                raise serializers.ValidationError({"imagem": [MENSAGEM_LIMITE]})
            criada = FotoRegistro.objects.create(
                registro=registro,
                imagem=foto.imagem,
                miniatura=foto.miniatura,
                largura=foto.largura,
                altura=foto.altura,
            )
        return Response(
            FotoSerializer(criada, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FotoDoRegistroView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ThrottleEscrita]
    throttle_scope = "escrita"

    @extend_schema(responses={204: None})
    def delete(self, request, pk: int, foto_id: int) -> Response:
        registro = registro_do_dono(request, pk)
        get_object_or_404(registro.fotos.all(), pk=foto_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
