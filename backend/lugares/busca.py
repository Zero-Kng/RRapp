from django.db.models import Case, F, IntegerField, QuerySet, Value, When

from lugares.models import Restaurante

ORDENS = {
    "relevancia": ["nome", "id"],
    "nome": ["nome", "id"],
    "nota": [F("nota_media").desc(nulls_last=True), "-total_avaliacoes", "nome", "id"],
    "populares": ["-total_avaliacoes", "nome", "id"],
    "recentes": ["-criado_em", "-id"],
}


def buscar_restaurantes(filtros: dict) -> QuerySet[Restaurante]:
    restaurantes = (
        Restaurante.objects.exclude(status=Restaurante.Status.PENDENTE)
        .select_related("cidade")
        .prefetch_related("categorias")
    )
    if filtros.get("cidade"):
        restaurantes = restaurantes.filter(cidade__slug=filtros["cidade"])
    palavras = (filtros.get("q") or "").split()[:5]
    for palavra in palavras:
        restaurantes = restaurantes.filter(nome__unaccent__icontains=palavra)
    if filtros.get("bairro"):
        restaurantes = restaurantes.filter(bairro__iexact=filtros["bairro"])
    if filtros.get("categoria"):
        restaurantes = restaurantes.filter(categorias__slug=filtros["categoria"])
    if filtros.get("preco"):
        restaurantes = restaurantes.filter(faixa_preco=filtros["preco"])
    if filtros.get("nota_min") is not None:
        restaurantes = restaurantes.filter(nota_media__gte=filtros["nota_min"])

    ordem = filtros.get("ordem") or ("relevancia" if palavras else "nome")
    if ordem == "relevancia" and palavras:
        restaurantes = restaurantes.annotate(
            comeca_com_termo=Case(
                When(nome__unaccent__istartswith=palavras[0], then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        return restaurantes.order_by("comeca_com_termo", "-total_avaliacoes", "nome", "id")
    return restaurantes.order_by(*ORDENS[ordem])
