from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from contas.models import Usuario


def enviar_email_redefinicao(usuario: Usuario) -> None:
    uid = urlsafe_base64_encode(force_bytes(usuario.pk))
    token = default_token_generator.make_token(usuario)
    link = f"{settings.FRONTEND_URL}/redefinir-senha?uid={uid}&token={token}"
    send_mail(
        subject="Redefinição de senha — rrapp",
        message=(
            f"Olá, {usuario.username}!\n\n"
            f"Para criar uma nova senha, acesse:\n{link}\n\n"
            "O link vale por 1 hora e só pode ser usado uma vez. "
            "Se você não pediu a redefinição, ignore este e-mail."
        ),
        from_email=None,
        recipient_list=[usuario.email],
    )


def usuario_do_link(uid: str, token: str) -> Usuario | None:
    """Devolve o usuário se o link for válido; o token deixa de valer quando a senha muda."""
    try:
        pk = int(force_str(urlsafe_base64_decode(uid)))
        usuario = Usuario.objects.get(pk=pk, is_active=True)
    except ValueError, TypeError, OverflowError, Usuario.DoesNotExist:
        return None
    return usuario if default_token_generator.check_token(usuario, token) else None
