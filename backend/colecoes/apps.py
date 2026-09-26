from django.apps import AppConfig


class ColecoesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "colecoes"
    verbose_name = "coleções"

    def ready(self) -> None:
        from colecoes import signals  # noqa: F401  (registra os receivers)
