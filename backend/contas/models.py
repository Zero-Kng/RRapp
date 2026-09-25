from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Usuário do rrapp. Os campos de perfil entram no plano da Fase 1."""

    email = models.EmailField("e-mail", unique=True)
