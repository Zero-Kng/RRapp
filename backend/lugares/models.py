from django.db import models


class Cidade(models.Model):
    nome = models.CharField(max_length=100)
    estado = models.CharField("estado (UF)", max_length=2)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(fields=["nome", "estado"], name="cidade_nome_estado_unica"),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.estado})"
