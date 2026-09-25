from io import StringIO

import qrcode
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice

from contas.models import Usuario


class Command(BaseCommand):
    help = "Cria o autenticador (2FA) de um usuário staff e mostra o QR code para escanear."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument(
            "--recriar", action="store_true", help="Substitui o autenticador atual por um novo."
        )

    def handle(self, *args, **opcoes):
        try:
            usuario = Usuario.objects.get(username__iexact=opcoes["username"], is_staff=True)
        except Usuario.DoesNotExist as erro:
            raise CommandError(f"Usuário staff '{opcoes['username']}' não encontrado.") from erro

        existentes = TOTPDevice.objects.filter(user=usuario)
        if existentes.exists() and not opcoes["recriar"]:
            raise CommandError(
                "Este usuário já tem um autenticador. Use --recriar para gerar outro "
                "(o antigo deixa de funcionar)."
            )
        existentes.delete()
        dispositivo = TOTPDevice.objects.create(
            user=usuario, name="app autenticador", confirmed=True
        )

        qr = qrcode.QRCode(border=1)
        qr.add_data(dispositivo.config_url)
        qr.make(fit=True)
        desenho = StringIO()
        qr.print_ascii(out=desenho, invert=True)
        self.stdout.write(desenho.getvalue())
        self.stdout.write(
            "Escaneie o QR code com um app autenticador (Google Authenticator, Authy, "
            "Microsoft Authenticator...)."
        )
        self.stdout.write(
            f"Se não conseguir escanear, cadastre este endereço no app:\n{dispositivo.config_url}"
        )
