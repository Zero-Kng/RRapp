from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from lugares.busca import buscar_restaurantes
from lugares.models import Categoria, Cidade, Restaurante
from lugares.serializers import (
    CategoriaSerializer,
    CidadeSerializer,
    FiltrosBuscaSerializer,
    RestauranteResumoSerializer,
)


class CidadesView(generics.ListAPIView):
    queryset = Cidade.objects.all()
    serializer_class = CidadeSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class CategoriasView(generics.ListAPIView):
    queryset = Categoria.objects.order_by("nome")
    serializer_class = CategoriaSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class BairrosView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("cidade", str, required=True)],
        responses={200: serializers.ListSerializer(child=serializers.CharField())},
    )
    def get(self, request):
        cidade = request.query_params.get("cidade")
        if not cidade:
            raise serializers.ValidationError({"cidade": ["Informe o slug da cidade."]})
        bairros = (
            Restaurante.objects.filter(cidade__slug=cidade)
            .exclude(status=Restaurante.Status.PENDENTE)
            .exclude(bairro="")
            .values_list("bairro", flat=True)
            .distinct()
            .order_by("bairro")
        )
        return Response(list(bairros))


@extend_schema(parameters=[FiltrosBuscaSerializer])
class RestaurantesView(generics.ListAPIView):
    serializer_class = RestauranteResumoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        filtros = FiltrosBuscaSerializer(data=self.request.query_params)
        filtros.is_valid(raise_exception=True)
        return buscar_restaurantes(filtros.validated_data)
