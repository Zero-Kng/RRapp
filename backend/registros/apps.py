from django.apps import AppConfig


class RegistrosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "registros"

    def ready(self) -> None:
        from registros import signals  # noqa: F401  (registra os receivers)
