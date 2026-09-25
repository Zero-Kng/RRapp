from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q


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


class Categoria(models.Model):
    # null (e não "") para permitir várias categorias criadas à mão sem violar o unique
    fsq_id = models.CharField(max_length=32, unique=True, null=True, blank=True)  # noqa: DJ001
    nome_original = models.CharField(max_length=120, blank=True)
    nome = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Restaurante(models.Model):
    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        PENDENTE = "pendente", "Pendente"
        FECHADO = "fechado", "Fechado"

    fonte = models.CharField(max_length=20, blank=True)
    id_externo = models.CharField(max_length=64, blank=True)
    slug = models.SlugField(max_length=220, unique=True)
    nome = models.CharField(max_length=200)
    endereco = models.CharField("endereço", max_length=255, blank=True)
    bairro = models.CharField(max_length=100, blank=True, db_index=True)
    cidade = models.ForeignKey(Cidade, on_delete=models.PROTECT, related_name="restaurantes")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    categorias = models.ManyToManyField(Categoria, blank=True, related_name="restaurantes")
    faixa_preco = models.PositiveSmallIntegerField(
        "faixa de preço",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ATIVO, db_index=True
    )
    sugerido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="restaurantes_sugeridos",
    )
    bloquear_importacao = models.BooleanField(
        default=False,
        help_text="Marque para que reimportações não sobrescrevam correções feitas à mão.",
    )
    nota_media = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    total_avaliacoes = models.PositiveIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["fonte", "id_externo"],
                condition=~Q(id_externo=""),
                name="restaurante_fonte_id_externo_unico",
            ),
            models.CheckConstraint(
                condition=Q(faixa_preco__isnull=True) | Q(faixa_preco__gte=1, faixa_preco__lte=4),
                name="restaurante_faixa_preco_1_a_4",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.bairro})" if self.bairro else self.nome
