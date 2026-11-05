import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Cria o superusuário do deploy quando as variáveis de ambiente estão definidas."""

    help = (
        'Cria o superusuário a partir de DJANGO_SUPERUSER_USERNAME, '
        'DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_NOME e '
        'DJANGO_SUPERUSER_PASSWORD. Não faz nada se faltar alguma variável '
        'ou se o username já existir.'
    )

    def handle(self, *args, **options):
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', '').strip()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '').strip()
        nome = os.environ.get('DJANGO_SUPERUSER_NOME', '').strip()
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')

        if not all([username, email, nome, password]):
            self.stdout.write(
                'Variáveis do superusuário ausentes; criação ignorada.'
            )
            return

        usuario = get_user_model()
        if usuario.objects.filter(username=username).exists():
            self.stdout.write(f'Superusuário "{username}" já existe.')
            return

        usuario.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            nome=nome,
        )
        self.stdout.write(self.style.SUCCESS(f'Superusuário "{username}" criado.'))
