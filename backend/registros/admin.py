from django.contrib import admin
from django.utils.html import format_html

from registros.models import FotoRegistro, Registro


class FotoRegistroInline(admin.TabularInline):
    """As fotos aparecem dentro do registro; marcar "apagar" remove a foto e os arquivos."""

    model = FotoRegistro
    extra = 0
    fields = ("previa", "largura", "altura", "criada_em")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None) -> bool:
        return False

    @admin.display(description="foto")
    def previa(self, foto: FotoRegistro) -> str:
        return format_html('<img src="{}" height="80" alt="">', foto.miniatura.url)


@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
    list_display = ("usuario", "restaurante", "data_visita", "nota_em_estrelas", "curtiu")
    list_filter = ("curtiu", "revisita")
    list_select_related = ("usuario", "restaurante")
    search_fields = ("usuario__username", "restaurante__nome", "critica")
    raw_id_fields = ("usuario", "restaurante")
    date_hierarchy = "data_visita"
    inlines = [FotoRegistroInline]

    @admin.display(description="nota")
    def nota_em_estrelas(self, registro: Registro) -> str:
        return "—" if registro.nota is None else f"{registro.nota / 2:g} ★"
