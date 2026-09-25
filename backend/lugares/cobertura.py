from django.db.models import Count

from lugares.models import Categoria, Cidade, Restaurante


def gerar_relatorio(cidade: Cidade) -> dict:
    restaurantes = Restaurante.objects.filter(cidade=cidade)
    por_status = restaurantes.values_list("status").annotate(n=Count("id")).order_by()
    top_bairros = (
        restaurantes.exclude(bairro="")
        .values_list("bairro")
        .annotate(n=Count("id"))
        .order_by("-n", "bairro")[:10]
    )
    top_categorias = (
        Categoria.objects.filter(restaurantes__cidade=cidade)
        .values_list("nome")
        .annotate(n=Count("restaurantes"))
        .order_by("-n", "nome")[:10]
    )
    return {
        "total": restaurantes.count(),
        "por_status": dict(por_status),
        "sem_bairro": restaurantes.filter(bairro="").count(),
        "top_bairros": list(top_bairros),
        "top_categorias": list(top_categorias),
    }
