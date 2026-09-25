from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from registros.models import Registro
from registros.notas import recalcular_nota


@receiver([post_save, post_delete], sender=Registro)
def atualizar_nota_do_restaurante(sender, instance: Registro, **kwargs) -> None:
    """Vale para API, Admin e exclusões em cascata (ex.: conta excluída)."""
    recalcular_nota(instance.restaurante_id)
