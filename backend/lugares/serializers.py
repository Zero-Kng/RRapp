from decimal import Decimal

from rest_framework import serializers

from lugares.models import Categoria, Cidade, Restaurante


class CidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cidade
        fields = ["slug", "nome", "estado"]


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["slug", "nome"]


class RestauranteResumoSerializer(serializers.ModelSerializer):
    cidade = CidadeSerializer(read_only=True)
    categorias = CategoriaSerializer(many=True, read_only=True)
    nota_media = serializers.SerializerMethodField()

    class Meta:
        model = Restaurante
        fields = [
            "slug",
            "nome",
            "bairro",
            "cidade",
            "categorias",
            "faixa_preco",
            "nota_media",
            "total_avaliacoes",
            "status",
        ]

    def get_nota_media(self, restaurante: Restaurante) -> float | None:
        return None if restaurante.nota_media is None else float(restaurante.nota_media)


class FiltrosBuscaSerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, max_length=100)
    cidade = serializers.SlugField(required=False)
    bairro = serializers.CharField(required=False, max_length=100)
    categoria = serializers.SlugField(required=False)
    preco = serializers.IntegerField(required=False, min_value=1, max_value=4)
    nota_min = serializers.DecimalField(
        required=False,
        max_digits=2,
        decimal_places=1,
        min_value=Decimal("0"),
        max_value=Decimal("5"),
    )
    ordem = serializers.ChoiceField(
        required=False, choices=["relevancia", "nome", "nota", "populares", "recentes"]
    )
