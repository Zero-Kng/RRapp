from django.db.models.signals import post_save
from django.dispatch import receiver

from colecoes.models import Desejo
from registros.models import Registro


@receiver(post_save, sender=Registro)
def tirar_dos_desejos(sender, instance: Registro, created: bool, **kwargs) -> None:
    """Quem registra uma visita já foi: o restaurante sai dos desejos (API, Admin, qualquer
    caminho). Só na criação: editar um registro antigo não mexe num desejo guardado depois."""
    if not created:
        return
    Desejo.objects.filter(
        usuario_id=instance.usuario_id, restaurante_id=instance.restaurante_id
    ).delete()
