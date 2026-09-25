import pytest
from rest_framework import serializers

from registros.campos import CampoNota


class ComNota(serializers.Serializer):
    nota = CampoNota(allow_null=True, required=False)


@pytest.mark.parametrize(
    ("entrada", "guardado"),
    [(3.5, 7), ("3.5", 7), (0, 0), (5, 10), ("0.5", 1), (4, 8), (None, None)],
)
def test_converte_estrelas_em_meias_estrelas(entrada, guardado):
    serializer = ComNota(data={"nota": entrada})

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["nota"] == guardado


@pytest.mark.parametrize("entrada", [3.7, 5.5, -0.5, "3,5", True, "", "abc", [], 10])
def test_recusa_notas_fora_do_padrao(entrada):
    serializer = ComNota(data={"nota": entrada})

    assert not serializer.is_valid()
    assert serializer.errors["nota"] == ["A nota deve ser de 0 a 5, em passos de 0,5 (ex.: 3.5)."]


def test_representa_em_estrelas():
    assert CampoNota().to_representation(7) == 3.5
    assert CampoNota().to_representation(10) == 5.0
