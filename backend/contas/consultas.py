from django.shortcuts import get_object_or_404

from contas.models import Usuario


def usuario_ativo(username: str) -> Usuario:
    """Usuário pelo username (sem diferenciar maiúsculas); suspenso ou inexistente dá 404."""
    return get_object_or_404(Usuario, username__iexact=username, is_active=True)
