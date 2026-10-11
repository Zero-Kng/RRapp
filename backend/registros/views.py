from django.db.models import Exists, OuterRef, Q, QuerySet
from rest_framework import generics
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly

from config.api import ThrottleEscrita
from lugares.models import Restaurante
from registros.models import FotoRegistro, Registro
from registros.permissoes import EhDonoOuSomenteLeitura
from registros.serializers import ItemDoFeedSerializer, RegistroSerializer


def registros_com_relacoes():
    """Registros visíveis: os de usuários suspensos somem da API."""
    return (
        Registro.objects.filter(usuario__is_active=True)
        .select_related("usuario", "restaurante__cidade")
        .prefetch_related("restaurante__categorias", "fotos")
    )


def com_critica_ou_foto(consulta: QuerySet[Registro]) -> QuerySet[Registro]:
    """Só os registros que têm o que mostrar: crítica ou pelo menos uma foto."""
    return consulta.filter(
        ~Q(critica="") | Exists(FotoRegistro.objects.filter(registro=OuterRef("pk")))
    )


class CriarRegistroView(generics.CreateAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ThrottleEscrita]
    throttle_scope = "escrita"

    def perform_create(self, serializer) -> None:
        serializer.save(usuario=self.request.user)


class RegistroView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, EhDonoOuSomenteLeitura]
    throttle_classes = [ThrottleEscrita]
    throttle_scope = "escrita"
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return registros_com_relacoes()


class PaginacaoDoFeed(CursorPagination):
    """Por cursor: registros novos não fazem itens se repetirem nem pularem ao rolar."""

    page_size = 20
    ordering = ("-criado_em", "-id")


class FeedView(generics.ListAPIView):
    """Feed da comunidade: as visitas mais recentes de todo mundo com crítica ou foto."""

    serializer_class = ItemDoFeedSerializer
    permission_classes = [AllowAny]
    pagination_class = PaginacaoDoFeed

    def get_queryset(self):
        return com_critica_ou_foto(registros_com_relacoes()).exclude(
            restaurante__status=Restaurante.Status.PENDENTE
        )
