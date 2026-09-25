from django.contrib import admin

from lugares.models import Categoria, Cidade, Restaurante


@admin.register(Cidade)
class CidadeAdmin(admin.ModelAdmin):
    list_display = ("nome", "estado", "slug")
    search_fields = ("nome",)
    prepopulated_fields = {"slug": ("nome",)}


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("slug", "nome", "nome_original")
    list_display_links = ("slug",)
    list_editable = ("nome",)
    search_fields = ("nome", "nome_original")
    readonly_fields = ("fsq_id", "nome_original")


@admin.register(Restaurante)
class RestauranteAdmin(admin.ModelAdmin):
    list_display = ("nome", "bairro", "cidade", "status", "bloquear_importacao")
    list_filter = ("status", "cidade", "bloquear_importacao")
    list_select_related = ("cidade",)
    search_fields = ("nome", "bairro", "endereco")
    readonly_fields = (
        "fonte",
        "id_externo",
        "nota_media",
        "total_avaliacoes",
        "criado_em",
        "atualizado_em",
    )
    filter_horizontal = ("categorias",)
    raw_id_fields = ("sugerido_por",)
