from django.contrib import admin

from colecoes.models import Desejo


@admin.register(Desejo)
class DesejoAdmin(admin.ModelAdmin):
    list_display = ("usuario", "restaurante", "adicionado_em")
    list_select_related = ("usuario", "restaurante")
    search_fields = ("usuario__username", "restaurante__nome")
    raw_id_fields = ("usuario", "restaurante")
