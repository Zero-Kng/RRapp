from django.contrib import admin

from registros.models import Registro


@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
    list_display = ("usuario", "restaurante", "data_visita", "nota_em_estrelas", "curtiu")
    list_filter = ("curtiu", "revisita")
    list_select_related = ("usuario", "restaurante")
    search_fields = ("usuario__username", "restaurante__nome", "critica")
    raw_id_fields = ("usuario", "restaurante")
    date_hierarchy = "data_visita"

    @admin.display(description="nota")
    def nota_em_estrelas(self, registro: Registro) -> str:
        return "—" if registro.nota is None else f"{registro.nota / 2:g} ★"
