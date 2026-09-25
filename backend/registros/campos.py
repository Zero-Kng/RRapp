from decimal import Decimal, InvalidOperation

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers


@extend_schema_field({"type": "number", "minimum": 0, "maximum": 5, "multipleOf": 0.5})
class CampoNota(serializers.Field):
    """Nota em estrelas na API (0 a 5, passo 0,5) e em meias estrelas no banco (0 a 10)."""

    default_error_messages = {
        "invalida": "A nota deve ser de 0 a 5, em passos de 0,5 (ex.: 3.5).",
    }

    def to_internal_value(self, dado) -> int:
        if isinstance(dado, bool) or not isinstance(dado, (int, float, str)):
            self.fail("invalida")
        try:
            dobro = Decimal(str(dado)) * 2
        except InvalidOperation:
            self.fail("invalida")
        if not dobro.is_finite() or dobro != dobro.to_integral_value() or not 0 <= dobro <= 10:
            self.fail("invalida")
        return int(dobro)

    def to_representation(self, valor: int) -> float:
        return valor / 2
