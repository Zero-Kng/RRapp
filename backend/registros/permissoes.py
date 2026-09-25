from rest_framework.permissions import SAFE_METHODS, BasePermission


class EhDonoOuSomenteLeitura(BasePermission):
    """Qualquer um lê; só o dono altera. A moderação acontece no Admin, não pela API."""

    message = "Só o autor pode alterar este registro."

    def has_object_permission(self, request, view, obj) -> bool:
        return request.method in SAFE_METHODS or obj.usuario_id == request.user.id
