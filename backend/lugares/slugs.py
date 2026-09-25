from django.db.models import Model
from django.utils.text import slugify


def gerar_slug_unico(
    modelo: type[Model], texto: str, *, max_length: int = 200, reserva: str = "restaurante"
) -> str:
    """Gera um slug sem acentos, único no campo `slug` do modelo (sufixos -2, -3, ...)."""
    base = slugify(texto)[:max_length].strip("-") or reserva
    slug = base
    numero = 2
    while modelo.objects.filter(slug=slug).exists():
        sufixo = f"-{numero}"
        slug = f"{base[: max_length - len(sufixo)].rstrip('-')}{sufixo}"
        numero += 1
    return slug
