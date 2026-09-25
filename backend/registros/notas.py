from collections import Counter
from decimal import ROUND_HALF_UP, Decimal

from lugares.models import Restaurante
from registros.models import Registro


def ultimas_notas(restaurante_id: int) -> list[int]:
    """Nota mais recente de cada usuário ativo (em meias estrelas); ignora registros sem nota."""
    return list(
        Registro.objects.filter(
            restaurante_id=restaurante_id, nota__isnull=False, usuario__is_active=True
        )
        .order_by("usuario_id", "-data_visita", "-criado_em")
        .distinct("usuario_id")
        .values_list("nota", flat=True)
    )


def recalcular_nota(restaurante_id: int) -> None:
    notas = ultimas_notas(restaurante_id)
    media = None
    if notas:
        media = (Decimal(sum(notas)) / (2 * len(notas))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    Restaurante.objects.filter(pk=restaurante_id).update(
        nota_media=media, total_avaliacoes=len(notas)
    )


def histograma(restaurante_id: int) -> list[dict]:
    contagem = Counter(ultimas_notas(restaurante_id))
    return [{"nota": meias / 2, "quantidade": contagem.get(meias, 0)} for meias in range(11)]
