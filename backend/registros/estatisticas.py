import datetime

from django.utils import timezone

from registros.models import Registro


def numeros_do_usuario(usuario, hoje: datetime.date | None = None) -> dict[str, int]:
    hoje = hoje or timezone.localdate()
    registros = Registro.objects.filter(usuario=usuario)
    return {
        "visitados": registros.values("restaurante_id").distinct().count(),
        "visitados_este_ano": registros.filter(data_visita__year=hoje.year)
        .values("restaurante_id")
        .distinct()
        .count(),
    }
