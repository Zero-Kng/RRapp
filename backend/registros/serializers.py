import datetime

from django.utils import timezone
from rest_framework import serializers

from contas.serializers import UsuarioResumoSerializer
from lugares.models import Restaurante
from lugares.serializers import RestauranteResumoSerializer
from registros.campos import CampoNota
from registros.models import Registro

DATA_MINIMA = datetime.date(1900, 1, 1)


class RegistroSerializer(serializers.ModelSerializer):
    restaurante = RestauranteResumoSerializer(read_only=True)
    restaurante_slug = serializers.SlugRelatedField(
        source="restaurante",
        slug_field="slug",
        queryset=Restaurante.objects.exclude(status=Restaurante.Status.PENDENTE),
        write_only=True,
    )
    usuario = UsuarioResumoSerializer(read_only=True)
    nota = CampoNota(required=False, allow_null=True)
    critica = serializers.CharField(required=False, allow_blank=True, max_length=5000)

    class Meta:
        model = Registro
        fields = [
            "id",
            "restaurante",
            "restaurante_slug",
            "usuario",
            "data_visita",
            "nota",
            "critica",
            "curtiu",
            "revisita",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = ["id", "criado_em", "atualizado_em"]

    def validate_data_visita(self, valor: datetime.date) -> datetime.date:
        if valor > timezone.localdate():
            raise serializers.ValidationError("A data da visita não pode estar no futuro.")
        if valor < DATA_MINIMA:
            raise serializers.ValidationError("Data da visita inválida.")
        return valor

    def validate(self, dados: dict) -> dict:
        novo = dados.get("restaurante")
        if self.instance is not None and novo is not None and novo != self.instance.restaurante:
            raise serializers.ValidationError(
                {"restaurante_slug": "Não é possível trocar o restaurante de um registro."}
            )
        return dados
