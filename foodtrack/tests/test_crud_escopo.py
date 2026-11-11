from decimal import Decimal

from django.urls import reverse
from rest_framework.test import APITestCase

from foodtrack.models import Alimento, Desperdicio, Estoque, Restaurante, Usuario


class CrudEscopoTests(APITestCase):
    def setUp(self):
        self.casa = Restaurante.objects.create(nome='Casa Verde', cnpj='00.000.000/0001-00')
        self.outra = Restaurante.objects.create(nome='Outra Mesa', cnpj='11.111.111/0001-11')
        self.ana = Usuario.objects.create_user(
            username='ana',
            email='ana@casa.test',
            password='senha-forte-123',
            nome='Ana',
            perfil='gerente',
            restaurante=self.casa,
        )
        self.bia = Usuario.objects.create_user(
            username='bia',
            email='bia@outra.test',
            password='senha-forte-123',
            nome='Bia',
            perfil='gerente',
            restaurante=self.outra,
        )
        self.root = Usuario.objects.create_superuser(
            username='root',
            email='root@foodtrack.test',
            password='senha-forte-123',
            nome='Root',
        )
        self.alimento_casa = Alimento.objects.create(
            nome='Arroz',
            categoria='Grãos',
            medida='Kg',
            restaurante=self.casa,
        )
        self.alimento_outra = Alimento.objects.create(
            nome='Feijão',
            categoria='Grãos',
            medida='Kg',
            restaurante=self.outra,
        )

    def autenticar(self, usuario):
        self.client.force_authenticate(user=usuario)

    def test_lista_de_restaurante_fica_na_empresa_do_usuario(self):
        self.autenticar(self.ana)
        resposta = self.client.get(reverse('api-restaurante-list'))
        self.assertEqual(resposta.status_code, 200)
        nomes = [item['nome'] for item in resposta.data]
        self.assertEqual(nomes, ['Casa Verde'])

    def test_usuario_comum_so_ve_alimentos_do_proprio_restaurante(self):
        self.autenticar(self.ana)
        resposta = self.client.get(reverse('api-alimento-list'))
        nomes = [item['nome'] for item in resposta.data]
        self.assertEqual(nomes, ['Arroz'])

    def test_usuario_comum_recebe_restaurante_no_serializer_sem_poder_altera_lo(self):
        self.autenticar(self.ana)
        resposta = self.client.get(reverse('api-usuario-list'))
        self.assertEqual(resposta.status_code, 200)
        ana = next(item for item in resposta.data if item['username'] == 'ana')
        self.assertEqual(ana['restaurante'], self.casa.pk)
        self.assertFalse(ana['is_superuser'])

    def test_cadastro_de_alimento_ignora_restaurante_de_outra_empresa(self):
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-alimento-list'), {
            'nome': 'Tomate',
            'categoria': 'Hortaliça',
            'medida': 'Kg',
            'restaurante': self.outra.pk,
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        tomate = Alimento.objects.get(nome='Tomate')
        self.assertEqual(tomate.restaurante, self.casa)
        self.assertEqual(resposta.data['restaurante'], self.casa.pk)

    def test_medida_de_alimento_deve_ser_uma_opcao_do_enum(self):
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-alimento-list'), {
            'nome': 'Leite',
            'categoria': 'Laticínios',
            'medida': 'litros',
        }, format='json')
        self.assertEqual(resposta.status_code, 400)
        self.assertIn('medida', resposta.data)

    def test_estoque_expoe_validade_e_nao_expoe_campos_fora_do_diagrama(self):
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-estoque-list'), {
            'alimento': self.alimento_casa.pk,
            'quantidade_atual': 10,
            'entrada': '2026-10-01',
            'localizacao': 'Câmara fria',
            'validade': '2026-10-30',
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        self.assertIn('quantidade_atual', resposta.data)
        self.assertNotIn('qntd_atual', resposta.data)
        self.assertEqual(resposta.data['validade'], '2026-10-30')
        self.assertNotIn('lote', resposta.data)
        self.assertNotIn('custo_unitario', resposta.data)

    def test_usuario_comum_nao_cadastra_estoque_de_outro_restaurante(self):
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-estoque-list'), {
            'alimento': self.alimento_outra.pk,
            'quantidade_atual': 10,
            'entrada': '2026-09-29',
            'localizacao': 'Câmara fria',
        }, format='json')
        self.assertEqual(resposta.status_code, 400)
        self.assertFalse(Estoque.objects.exists())

    def test_desperdicio_fica_com_o_usuario_logado_e_o_estoque_da_empresa(self):
        estoque = Estoque.objects.create(
            alimento=self.alimento_casa,
            quantidade_atual=8,
            entrada='2026-09-01',
            localizacao='Despensa',
        )
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-desperdicio-list'), {
            'descricao': 'Queimou',
            'quantidade': 2,
            'data': '2026-09-29',
            'estoque': estoque.pk,
            'usuario': self.bia.pk,
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        registro = Desperdicio.objects.get()
        self.assertEqual(registro.usuario, self.ana)
        self.assertEqual(registro.estoque, estoque)
        self.assertEqual(registro.motivo, 'outro')
        self.assertEqual(resposta.data['usuario'], self.ana.pk)
        estoque.refresh_from_db()
        self.assertEqual(estoque.quantidade_atual, 6)

    def test_desperdicio_maior_que_o_estoque_e_recusado_sem_alterar_o_lote(self):
        estoque = Estoque.objects.create(
            alimento=self.alimento_casa,
            quantidade_atual='1.500',
            entrada='2026-09-01',
            localizacao='Despensa',
        )
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-desperdicio-list'), {
            'motivo': 'vencimento',
            'quantidade': '1.501',
            'data': '2026-09-29',
            'estoque': estoque.pk,
        }, format='json')
        self.assertEqual(resposta.status_code, 400)
        self.assertIn('quantidade', resposta.data)
        self.assertFalse(Desperdicio.objects.filter(estoque=estoque).exists())
        estoque.refresh_from_db()
        self.assertEqual(estoque.quantidade_atual, Decimal('1.500'))

    def test_usuario_comum_cadastra_colega_no_proprio_restaurante(self):
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-usuario-list'), {
            'username': 'carla',
            'nome': 'Carla',
            'email': 'carla@casa.test',
            'perfil': 'funcionario',
            'password': 'senha-forte-123',
            'restaurante': self.outra.pk,
            'is_superuser': True,
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        carla = Usuario.objects.get(username='carla')
        self.assertEqual(carla.restaurante, self.casa)
        self.assertEqual(carla.perfil, 'funcionario')
        self.assertFalse(carla.is_superuser)
        self.assertNotIn('password', resposta.data)

    def test_superusuario_pode_ficar_sem_restaurante(self):
        self.autenticar(self.root)
        resposta = self.client.post(reverse('api-usuario-list'), {
            'username': 'novo-root',
            'nome': 'Novo Root',
            'email': 'novo@foodtrack.test',
            'perfil': 'proprietario',
            'password': 'senha-forte-123',
            'is_superuser': True,
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        novo = Usuario.objects.get(username='novo-root')
        self.assertTrue(novo.is_superuser)
        self.assertEqual(novo.perfil, Usuario.Perfil.SUPERUSER)
        self.assertEqual(resposta.data['perfil'], 'superuser')
        self.assertIsNone(novo.restaurante)

    def test_usuario_comum_nao_gerencia_restaurante(self):
        self.autenticar(self.ana)
        resposta = self.client.post(reverse('api-restaurante-list'), {
            'nome': 'Nova Casa',
            'cnpj': '22.222.222/0001-22',
        }, format='json')
        self.assertEqual(resposta.status_code, 403)
        self.assertFalse(Restaurante.objects.filter(nome='Nova Casa').exists())

    def test_usuario_nao_se_exclui(self):
        self.autenticar(self.ana)
        resposta = self.client.delete(reverse('api-usuario-detail', args=[self.ana.pk]))
        self.assertEqual(resposta.status_code, 403)
        self.assertTrue(Usuario.objects.filter(pk=self.ana.pk).exists())

    def test_schema_openapi_lista_as_rotas(self):
        resposta = self.client.get(reverse('schema'))
        self.assertEqual(resposta.status_code, 200)
        corpo = resposta.content.decode()
        self.assertIn('/api/token/', corpo)
        self.assertIn('/api/alimentos/', corpo)
        self.assertIn('/api/desperdicios/{id}/', corpo)
        self.assertNotIn('/api/swagger/', corpo)
        self.assertNotIn('/api/docs/', corpo)

    def test_swagger_e_apidocs_sao_publicos(self):
        swagger = self.client.get(reverse('swagger'))
        apidocs = self.client.get(reverse('apidocs'))
        self.assertEqual(swagger.status_code, 200)
        self.assertEqual(apidocs.status_code, 200)
        self.assertIn('swagger-ui', swagger.content.decode())
        self.assertIn('redoc', apidocs.content.decode().lower())
        self.assertIn('/api/schema/', swagger.content.decode())
        self.assertIn('/api/schema/', apidocs.content.decode())

    def test_cnpj_e_gravado_com_mascara(self):
        self.autenticar(self.root)
        resposta = self.client.post(reverse('api-restaurante-list'), {
            'nome': 'Casa da Máscara',
            'cnpj': '33444555000166',
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data['cnpj'], '33.444.555/0001-66')
        self.assertEqual(resposta.data['dias_alerta_validade'], 3)

    def test_cnpj_invalido_e_perfil_fora_da_lista_sao_recusados(self):
        self.autenticar(self.root)
        cnpj = self.client.post(reverse('api-restaurante-list'), {
            'nome': 'Sem Máscara Válida',
            'cnpj': '123',
        }, format='json')
        self.assertEqual(cnpj.status_code, 400)
        self.assertIn('cnpj', cnpj.data)

        perfil = self.client.post(reverse('api-usuario-list'), {
            'username': 'perfil-livre',
            'nome': 'Perfil Livre',
            'email': 'livre@foodtrack.test',
            'perfil': 'cozinha',
            'password': 'senha-forte-123',
            'restaurante': self.casa.pk,
        }, format='json')
        self.assertEqual(perfil.status_code, 400)
        self.assertIn('perfil', perfil.data)

        administrador = self.client.post(reverse('api-usuario-list'), {
            'username': 'admin-falso',
            'nome': 'Admin Falso',
            'email': 'falso@foodtrack.test',
            'perfil': 'superuser',
            'password': 'senha-forte-123',
            'restaurante': self.casa.pk,
        }, format='json')
        self.assertEqual(administrador.status_code, 400)
        self.assertIn('perfil', administrador.data)

    def test_token_autentica_a_requisicao(self):
        resposta = self.client.post(reverse('api-token'), {
            'username': 'ana',
            'password': 'senha-forte-123',
        }, format='json')
        self.assertEqual(resposta.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {resposta.data['token']}")
        lista = self.client.get(reverse('api-alimento-list'))
        self.assertEqual(lista.status_code, 200)
        self.assertEqual(lista.data[0]['nome'], 'Arroz')

