from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from registros.models import FotoRegistro, Registro
from registros.notas import recalcular_nota


@receiver([post_save, post_delete], sender=Registro)
def atualizar_nota_do_restaurante(sender, instance: Registro, **kwargs) -> None:
    """Vale para API, Admin e exclusões em cascata (ex.: conta excluída)."""
    recalcular_nota(instance.restaurante_id)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def atualizar_notas_ao_suspender_ou_reativar(
    sender, instance, update_fields=None, **kwargs
) -> None:
    """Suspender (ou reativar) um usuário tira (ou devolve) as notas dele das médias."""
    if update_fields is not None and "is_active" not in update_fields:
        return  # ex.: login atualiza só last_login
    restaurantes = (
        Registro.objects.filter(usuario=instance, nota__isnull=False)
        .order_by()
        .values_list("restaurante_id", flat=True)
        .distinct()
    )
    for restaurante_id in restaurantes:
        recalcular_nota(restaurante_id)


@receiver(post_delete, sender=FotoRegistro)
def apagar_arquivos_da_foto(sender, instance: FotoRegistro, **kwargs) -> None:
    """Vale para a API, o Admin e as cascatas (registro apagado, conta excluída)."""
    instance.imagem.delete(save=False)
    instance.miniatura.delete(save=False)
