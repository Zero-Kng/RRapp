from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

from config.api import ThrottleEscrita
from registros.models import Registro
from registros.permissoes import EhDonoOuSomenteLeitura
from registros.serializers import RegistroSerializer


def registros_com_relacoes():
    return Registro.objects.select_related("usuario", "restaurante__cidade").prefetch_related(
        "restaurante__categorias"
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
