import os
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from foodtrack.models import Usuario


class CriarSuperusuarioTests(TestCase):
    def test_cria_uma_vez_quando_as_variaveis_existem(self):
        ambiente = {
            'DJANGO_SUPERUSER_USERNAME': 'admin',
            'DJANGO_SUPERUSER_EMAIL': 'admin@foodtrack.test',
            'DJANGO_SUPERUSER_NOME': 'Admin',
            'DJANGO_SUPERUSER_PASSWORD': 'senha-forte-123',
        }
        with patch.dict(os.environ, ambiente):
            call_command('criar_superusuario')
            call_command('criar_superusuario')

        criado = Usuario.objects.get(username='admin')
        self.assertTrue(criado.is_superuser)
        self.assertEqual(criado.perfil, Usuario.Perfil.SUPERUSER)
        self.assertEqual(criado.nome, 'Admin')
        self.assertEqual(Usuario.objects.filter(username='admin').count(), 1)

    def test_ignora_quando_falta_variavel(self):
        ambiente = {
            'DJANGO_SUPERUSER_USERNAME': '',
            'DJANGO_SUPERUSER_EMAIL': '',
            'DJANGO_SUPERUSER_NOME': '',
            'DJANGO_SUPERUSER_PASSWORD': '',
        }
        with patch.dict(os.environ, ambiente):
            call_command('criar_superusuario')

        self.assertFalse(Usuario.objects.filter(is_superuser=True).exists())
