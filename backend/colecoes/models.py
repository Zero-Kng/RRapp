from django.conf import settings
from django.db import models


class Desejo(models.Model):
    """Restaurante que o usuário quer conhecer (como a watchlist do Letterboxd)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="desejos"
    )
    # Cascata (e não PROTECT, como no Registro): é só uma referência e pode ser refeita
    restaurante = models.ForeignKey(
        "lugares.Restaurante", on_delete=models.CASCADE, related_name="desejos"
    )
    adicionado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-adicionado_em", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "restaurante"], name="desejo_unico_por_usuario"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.usuario} quer ir a {self.restaurante}"
