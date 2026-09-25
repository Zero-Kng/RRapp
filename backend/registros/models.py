from django.conf import settings
from django.core.validators import MaxValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Registro(models.Model):
    """Uma visita no diário, com nota e crítica opcionais (como um "log" do Letterboxd)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="registros"
    )
    restaurante = models.ForeignKey(
        "lugares.Restaurante", on_delete=models.PROTECT, related_name="registros"
    )
    data_visita = models.DateField("data da visita", default=timezone.localdate)
    nota = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MaxValueValidator(10)],
        help_text="Em meias estrelas: 0 a 10 (7 = 3,5 estrelas).",
    )
    critica = models.TextField("crítica", blank=True)
    curtiu = models.BooleanField(default=False)
    revisita = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data_visita", "-criado_em"]
        indexes = [
            models.Index(
                fields=["restaurante", "usuario", "-data_visita"], name="registro_rest_usuario_data"
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(nota__isnull=True) | Q(nota__lte=10), name="registro_nota_0_a_10"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.usuario} em {self.restaurante} ({self.data_visita})"
