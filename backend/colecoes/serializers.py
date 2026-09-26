from rest_framework import serializers

from colecoes.models import Desejo
from lugares.serializers import RestauranteResumoSerializer


class DesejoSerializer(serializers.ModelSerializer):
    restaurante = RestauranteResumoSerializer(read_only=True)

    class Meta:
        model = Desejo
        fields = ["restaurante", "adicionado_em"]


class FiltroDesejosSerializer(serializers.Serializer):
    ordem = serializers.ChoiceField(
        choices=["recentes", "bairro"], required=False, default="recentes"
    )
