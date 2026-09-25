from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class Usuario(AbstractUser):
    """Usuário do rrapp."""

    email = models.EmailField("e-mail", unique=True)
    nome_exibicao = models.CharField("nome de exibição", max_length=50, blank=True)
    bio = models.CharField(max_length=300, blank=True)
    avatar = models.ImageField(upload_to="avatares/", blank=True)
    cidade = models.ForeignKey(
        "lugares.Cidade", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    termos_versao = models.CharField("versão dos termos aceitos", max_length=20, blank=True)
    termos_aceitos_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("username"), name="usuario_username_unico_ci"),
            models.UniqueConstraint(Lower("email"), name="usuario_email_unico_ci"),
        ]
