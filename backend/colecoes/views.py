from django.db.models import Case, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from colecoes.models import Desejo
from colecoes.serializers import DesejoSerializer, FiltroDesejosSerializer
from config.api import ThrottleEscrita
from contas.consultas import usuario_ativo
from lugares.models import Restaurante


def restaurante_disponivel(slug: str) -> Restaurante:
    """Restaurantes que podem ir para desejos, favoritos e listas: todos, menos os pendentes."""
    return get_object_or_404(
        Restaurante.objects.exclude(status=Restaurante.Status.PENDENTE), slug=slug
    )


class DesejoView(APIView):
    """Guarda ou tira um restaurante dos desejos; repetir a mesma ação não dá erro."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ThrottleEscrita]
    throttle_scope = "escrita"

    @extend_schema(request=None, responses={204: None})
    def put(self, request, slug: str) -> Response:
        Desejo.objects.get_or_create(usuario=request.user, restaurante=restaurante_disponivel(slug))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, slug: str) -> Response:
        Desejo.objects.filter(usuario=request.user, restaurante__slug=slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(get=extend_schema(parameters=[FiltroDesejosSerializer]))
class DesejosView(generics.ListAPIView):
    serializer_class = DesejoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        usuario = usuario_ativo(self.kwargs["username"])
        filtros = FiltroDesejosSerializer(data=self.request.query_params)
        filtros.is_valid(raise_exception=True)
        desejos = (
            Desejo.objects.filter(usuario=usuario)
            .select_related("restaurante__cidade")
            .prefetch_related("restaurante__categorias")
        )
        if filtros.validated_data["ordem"] == "bairro":
            sem_bairro = Case(
                When(restaurante__bairro="", then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
            return desejos.order_by(sem_bairro, "restaurante__bairro", "restaurante__nome", "id")
        return desejos.order_by("-adicionado_em", "-id")
