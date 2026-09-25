from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.defaults import page_not_found


@require_GET
def saude(request):
    return JsonResponse({"status": "ok"})


def nao_encontrado(request, exception):
    """404 em JSON para a API; o resto do site mantém a página padrão."""
    if request.path.startswith("/api/"):
        erro = {"codigo": "nao_encontrado", "mensagem": "Recurso não encontrado.", "campos": {}}
        return JsonResponse({"erro": erro}, status=404)
    return page_not_found(request, exception)
