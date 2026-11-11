from datetime import date, timedelta

from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from foodtrack.models import Alimento, Desperdicio, Estoque, Restaurante, Usuario


class RotasRequisitosTests(APITestCase):
    def setUp(self):
        self.hoje = date.today()
        self.casa = Restaurante.objects.create(nome='Casa Verde', cnpj='00.000.000/0001-00')
        self.outra = Restaurante.objects.create(nome='Outra Mesa', cnpj='11.111.111/0001-11')
        self.gerente = Usuario.objects.create_user(
            username='gerente',
            email='gerente@casa.test',
            password='senha-forte-123',
            nome='Gerente',
            perfil='gerente',
            restaurante=self.casa,
        )
        self.funcionario = Usuario.objects.create_user(
            username='funcionario',
            email='func@casa.test',
            password='senha-forte-123',
            nome='Funcionário',
            perfil='funcionario',
            restaurante=self.casa,
        )
        self.vizinho = Usuario.objects.create_user(
            username='vizinho',
            email='vizinho@outra.test',
            password='senha-forte-123',
            nome='Vizinho',
            perfil='gerente',
            restaurante=self.outra,
        )
        self.alimento = Alimento.objects.create(
            nome='Leite',
            categoria='Laticínios',
            medida='L',
            restaurante=self.casa,
        )
        self.alimento_outro = Alimento.objects.create(
            nome='Café',
            categoria='Secos',
            medida='Kg',
            restaurante=self.outra,
        )
        self.vencido = self.criar_estoque(self.alimento, self.hoje - timedelta(days=1), '1.000')
        self.hoje_estoque = self.criar_estoque(self.alimento, self.hoje, '2.000')
        self.proximo = self.criar_estoque(self.alimento, self.hoje + timedelta(days=2), '3.000')
        self.folgado = self.criar_estoque(self.alimento, self.hoje + timedelta(days=40), '4.000')
        self.sem_validade = self.criar_estoque(self.alimento, None, '5.000')
        self.zerado = self.criar_estoque(self.alimento, self.hoje, '0.000')
        self.criar_estoque(self.alimento_outro, self.hoje, '9.000')

    def criar_estoque(self, alimento, validade, quantidade):
        return Estoque.objects.create(
            alimento=alimento,
            quantidade_atual=quantidade,
            entrada=self.hoje,
            localizacao='Despensa',
            validade=validade,
        )

    def autenticar(self, usuario):
        self.client.force_authenticate(user=usuario)

    def test_me_devolve_o_usuario_logado(self):
        self.autenticar(self.gerente)
        resposta = self.client.get(reverse('api-usuario-me'))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['username'], 'gerente')
        self.assertEqual(resposta.data['perfil'], 'gerente')
        self.assertNotIn('password', resposta.data)

    def test_logout_invalida_o_token(self):
        token = Token.objects.create(user=self.gerente)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        resposta = self.client.post(reverse('api-logout'))
        self.assertEqual(resposta.status_code, 204)
        self.assertFalse(Token.objects.filter(user=self.gerente).exists())
        consulta = self.client.get(reverse('api-usuario-me'))
        self.assertEqual(consulta.status_code, 401)

    def test_saude_e_publica(self):
        resposta = self.client.get(reverse('api-saude'))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data, {'status': 'ok'})

    def test_funcionario_consulta_e_registra_desperdicio_mas_nao_cadastra_alimento(self):
        self.autenticar(self.funcionario)
        lista = self.client.get(reverse('api-estoque-list'))
        self.assertEqual(lista.status_code, 200)

        bloqueio = self.client.post(reverse('api-alimento-list'), {
            'nome': 'Tomate',
            'categoria': 'Hortaliça',
            'medida': 'Kg',
        }, format='json')
        self.assertEqual(bloqueio.status_code, 403)

        registro = self.client.post(reverse('api-desperdicio-list'), {
            'motivo': 'vencimento',
            'quantidade': '1.000',
            'data': self.hoje.isoformat(),
            'estoque': self.vencido.pk,
        }, format='json')
        self.assertEqual(registro.status_code, 201)
        self.assertEqual(registro.data['motivo'], 'vencimento')
        self.assertEqual(registro.data['usuario'], self.funcionario.pk)

    def test_proximos_vencimentos_respeitam_o_restaurante_e_a_antecedencia(self):
        self.autenticar(self.gerente)
        resposta = self.client.get(reverse('api-estoque-proximos-vencimento'))
        self.assertEqual(resposta.status_code, 200)
        ids = [item['id'] for item in resposta.data]
        self.assertEqual(ids, [self.vencido.pk, self.hoje_estoque.pk, self.proximo.pk])
        self.assertEqual(resposta.data[0]['situacao'], 'vencido')
        self.assertEqual(resposta.data[1]['situacao'], 'hoje')
        self.assertEqual(resposta.data[2]['situacao'], 'proximo')
        self.assertTrue(all(item['restaurante'] == self.casa.pk for item in resposta.data))

    def test_alertas_trazem_mensagem_do_item_vencido(self):
        self.autenticar(self.gerente)
        resposta = self.client.get(reverse('api-alertas-validade'))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data[0]['estoque'], self.vencido.pk)
        self.assertIn('venceu', resposta.data[0]['mensagem'])

    def test_ordem_de_utilizacao_coloca_validade_antes_e_ignora_quantidade_zero(self):
        self.autenticar(self.gerente)
        resposta = self.client.get(reverse('api-estoque-ordem-utilizacao'))
        ids = [item['id'] for item in resposta.data]
        self.assertEqual(ids[0], self.vencido.pk)
        self.assertEqual(ids[-1], self.sem_validade.pk)
        self.assertNotIn(self.zerado.pk, ids)
        self.assertEqual(resposta.data[0]['posicao'], 1)

    def test_motivos_e_filtro_do_historico(self):
        Desperdicio.objects.create(
            motivo='vencimento',
            quantidade='1.000',
            data=self.hoje - timedelta(days=10),
            estoque=self.vencido,
            usuario=self.funcionario,
        )
        Desperdicio.objects.create(
            motivo='erro_de_preparo',
            quantidade='2.000',
            data=self.hoje,
            estoque=self.proximo,
            usuario=self.gerente,
        )
        self.autenticar(self.gerente)
        motivos = self.client.get(reverse('api-desperdicio-motivos'))
        self.assertEqual(motivos.status_code, 200)
        self.assertIn({'valor': 'vencimento', 'rotulo': 'Vencimento'}, motivos.data)

        filtrado = self.client.get(reverse('api-desperdicio-list'), {
            'motivo': 'erro_de_preparo',
            'data_inicio': self.hoje.isoformat(),
        })
        self.assertEqual(filtrado.status_code, 200)
        self.assertEqual(len(filtrado.data), 1)
        self.assertEqual(filtrado.data[0]['motivo'], 'erro_de_preparo')

    def test_relatorio_agrupa_por_motivo_sem_misturar_restaurante(self):
        Desperdicio.objects.create(
            motivo='vencimento',
            quantidade='4.000',
            data=self.hoje,
            estoque=self.folgado,
            usuario=self.funcionario,
        )
        Desperdicio.objects.create(
            motivo='outro',
            quantidade='1.000',
            data=self.hoje,
            estoque=self.proximo,
            usuario=self.gerente,
        )
        Desperdicio.objects.create(
            motivo='vencimento',
            quantidade='9.000',
            data=self.hoje,
            estoque=Estoque.objects.get(alimento=self.alimento_outro),
            usuario=self.vizinho,
        )
        self.autenticar(self.gerente)
        resposta = self.client.get(reverse('api-relatorio-desperdicios'))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['total_registros'], 2)
        self.assertEqual(resposta.data['grupos'][0]['chave'], 'vencimento')
        self.assertEqual(resposta.data['grupos'][0]['percentual'], '80.00')

    def test_configuracao_fica_no_restaurante_de_quem_altera(self):
        self.autenticar(self.funcionario)
        negado = self.client.patch(reverse('api-restaurante-configuracao'), {
            'dias_alerta_validade': 10,
        }, format='json')
        self.assertEqual(negado.status_code, 403)

        self.autenticar(self.gerente)
        atual = self.client.get(reverse('api-restaurante-configuracao'))
        self.assertEqual(atual.status_code, 200)
        self.assertEqual(atual.data['id'], self.casa.pk)
        alterado = self.client.patch(reverse('api-restaurante-configuracao'), {
            'dias_alerta_validade': 7,
        }, format='json')
        self.assertEqual(alterado.status_code, 200)
        self.casa.refresh_from_db()
        self.outra.refresh_from_db()
        self.assertEqual(self.casa.dias_alerta_validade, 7)
        self.assertEqual(self.outra.dias_alerta_validade, 3)
