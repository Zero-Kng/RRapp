from decimal import Decimal
from urllib.parse import quote

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from lugares.models import Categoria, Cidade, Restaurante
from registros.campos import CampoNota
from registros.models import Registro
from registros.notas import histograma


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


class BarraHistogramaSerializer(serializers.Serializer):
    nota = serializers.FloatField()
    quantidade = serializers.IntegerField()


class MeuRegistroSerializer(serializers.ModelSerializer):
    nota = CampoNota(allow_null=True)

    class Meta:
        model = Registro
        fields = ["id", "data_visita", "nota", "curtiu"]


class RestauranteDetalheSerializer(RestauranteResumoSerializer):
    latitude = serializers.FloatField(read_only=True, allow_null=True)
    longitude = serializers.FloatField(read_only=True, allow_null=True)
    link_mapa = serializers.SerializerMethodField()
    histograma = serializers.SerializerMethodField()
    meu_ultimo_registro = serializers.SerializerMethodField()
    na_minha_lista_de_desejos = serializers.SerializerMethodField()

    class Meta(RestauranteResumoSerializer.Meta):
        fields = [
            *RestauranteResumoSerializer.Meta.fields,
            "endereco",
            "latitude",
            "longitude",
            "link_mapa",
            "histograma",
            "meu_ultimo_registro",
            "na_minha_lista_de_desejos",
        ]

    def get_link_mapa(self, restaurante: Restaurante) -> str:
        if restaurante.latitude is not None and restaurante.longitude is not None:
            consulta = f"{restaurante.latitude},{restaurante.longitude}"
        else:
            partes = [restaurante.nome, restaurante.endereco or restaurante.bairro]
            consulta = ", ".join([*filter(None, partes), restaurante.cidade.nome])
        return f"https://www.google.com/maps/search/?api=1&query={quote(consulta)}"

    @extend_schema_field(BarraHistogramaSerializer(many=True))
    def get_histograma(self, restaurante: Restaurante) -> list[dict]:
        return histograma(restaurante.id)

    @extend_schema_field(MeuRegistroSerializer(allow_null=True))
    def get_meu_ultimo_registro(self, restaurante: Restaurante) -> dict | None:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None
        registro = (
            restaurante.registros.filter(usuario=request.user)
            .order_by("-data_visita", "-criado_em")
            .first()
        )
        return MeuRegistroSerializer(registro).data if registro else None

    def get_na_minha_lista_de_desejos(self, restaurante: Restaurante) -> bool:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        return restaurante.desejos.filter(usuario=request.user).exists()
