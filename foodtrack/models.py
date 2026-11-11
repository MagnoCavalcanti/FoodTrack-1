import re
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator
from django.db import connection, models, transaction
from django.contrib.auth.models import AbstractUser

CNPJ_MASCARA = re.compile(r'^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$')
MENSAGEM_CNPJ = 'Informe o CNPJ no formato 00.000.000/0000-00.'


def mascarar_cnpj(valor):
    """Padroniza os 14 dígitos do CNPJ sem validar seus dígitos verificadores."""
    # Aceita os 14 dígitos ou o texto já mascarado e devolve 00.000.000/0000-00.
    if valor is None:
        return valor
    texto = str(valor).strip()
    if CNPJ_MASCARA.fullmatch(texto):
        return texto
    digitos = re.sub(r'\D', '', texto)
    if len(digitos) != 14:
        return texto
    return (
        f'{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/'
        f'{digitos[8:12]}-{digitos[12:14]}'
    )

# Este arquivo define os modelos do banco de dados do projeto.
# Cada classe aqui representa uma tabela e os campos dela.
# O Django usa essas classes para criar/migrar o schema do banco automaticamente.

class Restaurante(models.Model):
    # Representa cada estabelecimento/empresa que usa o sistema.
    nome = models.CharField(max_length=150)
    cnpj = models.CharField(max_length=18, unique=True)
    # Antecedência usada para destacar e alertar validades deste restaurante.
    dias_alerta_validade = models.PositiveSmallIntegerField(
        default=3,
        validators=[MaxValueValidator(365)],
    )

    def clean(self):
        """Normaliza e valida o formato do CNPJ antes da gravação."""
        self.cnpj = mascarar_cnpj(self.cnpj)
        if not CNPJ_MASCARA.fullmatch(self.cnpj or ''):
            raise ValidationError({'cnpj': MENSAGEM_CNPJ})

    def save(self, *args, **kwargs):
        """Executa validação completa do modelo antes de persistir."""
        self.full_clean()
        super().save(*args, **kwargs)

    # Define como o objeto será exibido no admin e em mensagens do sistema.
    def __str__(self):
        return self.nome

class Usuario(AbstractUser):
    """Usuário Django estendido com perfil e vínculo opcional a restaurante."""

    class Perfil(models.TextChoices):
        SUPERUSER = 'superuser', 'Administrador do site'
        PROPRIETARIO = 'proprietario', 'Proprietário'
        GERENTE = 'gerente', 'Gerente'
        FUNCIONARIO = 'funcionario', 'Funcionário'

    # Extende o usuário padrão do Django para incluir dados específicos do sistema.
    # O Django já fornece username, password, is_staff, is_superuser, etc.
    nome = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    perfil = models.CharField(max_length=20, choices=Perfil.choices)

    # createsuperuser só pergunta os campos desta lista, além de username e senha.
    # O perfil do superusuário é definido no save(); nome não tem valor padrão.
    REQUIRED_FIELDS = ['email', 'nome']
    # O usuário nativo do Django guarda a senha com hash e já traz segurança básica.

    # null=True e blank=True são usados para permitir que o superusuário seja criado sem restaurante.
    # Usuários comuns devem estar vinculados a um restaurante; isso é validado em clean() e save().
    restaurante = models.ForeignKey(
        Restaurante,
        on_delete=models.CASCADE,
        related_name='usuarios',
        null=True,
        blank=True
    )

    class Meta:
        # Mantém o rótulo padrão do AbstractUser para o painel administrativo.
        verbose_name = 'user'
        verbose_name_plural = 'users'
        constraints = [
            # Restrição no banco para garantir integridade mesmo quando os dados forem atualizados
            # por caminhos que não passam pelo método save(), como QuerySet.update().
            # Só é permitido restaurante nulo para superusuários.
            models.CheckConstraint(
                condition=models.Q(is_superuser=True) | models.Q(restaurante__isnull=False),
                name='usuario_restaurante_nulo_apenas_superuser',
                violation_error_message='Usuários que não são superusuários precisam estar atrelados a um restaurante.',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_superuser=True, perfil='superuser')
                    | models.Q(
                        is_superuser=False,
                        perfil__in=['proprietario', 'gerente', 'funcionario'],
                    )
                ),
                name='usuario_perfil_conhecido',
                violation_error_message=(
                    'O superusuário precisa ter o perfil de administrador do site. '
                    'Os demais usuários precisam ser proprietário, gerente ou funcionário.'
                ),
            ),
        ]

    def clean(self):
        # Este método é chamado por formulários e pelo admin antes de salvar.
        # Ele garante que regras de negócio sejam validadas antes do registro.
        super().clean()
        self.ajustar_perfil()
        self.validar_restaurante()
        self.validar_perfil()

    def ajustar_perfil(self):
        """Mantém o perfil administrativo coerente com is_superuser."""
        # Superusuário não usa perfil de restaurante.
        if self.is_superuser:
            self.perfil = self.Perfil.SUPERUSER

    def validar_restaurante(self):
        """Exige restaurante para contas que não são superusuárias."""
        # Superusuário pode existir sem restaurante.
        # Qualquer usuário normal precisa ter um restaurante associado.
        if not self.is_superuser and self.restaurante_id is None:
            raise ValidationError({
                'restaurante': 'Usuários que não são superusuários precisam estar atrelados a um restaurante.',
            })

    def validar_perfil(self):
        """Aceita somente perfis operacionais para usuários comuns."""
        if self.is_superuser:
            return
        if self.perfil in (
            self.Perfil.PROPRIETARIO,
            self.Perfil.GERENTE,
            self.Perfil.FUNCIONARIO,
        ):
            return
        raise ValidationError({
            'perfil': 'O perfil precisa ser proprietário, gerente ou funcionário.',
        })

    def save(self, *args, **kwargs):
        # create_superuser e alguns fluxos de criação podem ignorar o método clean().
        # Então a validação também acontece aqui para evitar inconsistência no banco.
        self.ajustar_perfil()
        self.validar_restaurante()
        self.validar_perfil()
        super().save(*args, **kwargs)

    def __str__(self):
        # Exibe o nome de usuário no painel e em logs.
        return self.username


class Alimento(models.Model):
    """Ingrediente cadastrado para um restaurante e sua unidade de medida."""

    class UnidadeMedida(models.TextChoices):
        QUILOGRAMA = "Kg", "Kg"
        GRAMA = "g", "g"
        LITRO = "L", "L"
        MILILITRO = "ml", "ml"
        UNIDADE = "un", "Unidade"
        MACO = "maço", "Maço"
        CAIXA = "caixa", "Caixa"

    # Cada registro representa um produto/ingrediente cadastrado para um restaurante.
    nome = models.CharField(max_length=150)
    categoria = models.CharField(max_length=60)
    medida = models.CharField(
        max_length=10,
        choices=UnidadeMedida.choices,
    )

    restaurante = models.ForeignKey(
        Restaurante,
        on_delete=models.CASCADE,
        # Cria um acesso reverso para encontrar todos os alimentos de um restaurante.
        # Exemplo: restaurante.alimentos.all()
        related_name='alimentos'
    )

    def __str__(self):
        return self.nome


class Estoque(models.Model):
    """Lote/registro de quantidade de um alimento em um local de armazenamento."""

    # Registra a quantidade atual de um alimento em um ponto de armazenamento.
    quantidade_atual = models.DecimalField(max_digits=10, decimal_places=3)
    entrada = models.DateField()
    saida = models.DateField(null=True, blank=True)
    localizacao = models.CharField(max_length=150)
    validade = models.DateField(null=True, blank=True)

    # Relacionamento com o alimento: um estoque pertence a um único alimento.
    alimento = models.ForeignKey(
        Alimento,
        on_delete=models.CASCADE,
        # Permite acessar todos os registros de estoque de um alimento.
        # Exemplo: alimento.estoques.all()
        related_name='estoques'
    )

    def __str__(self):
        # Exibe o nome do alimento seguido da quantidade disponível.
        return f'{self.alimento.nome} - {self.quantidade_atual}'


class Desperdicio(models.Model):
    """Registro de perda relacionado ao estoque e ao usuário que o lançou."""

    class Motivo(models.TextChoices):
        VENCIMENTO = 'vencimento', 'Vencimento'
        ARMAZENAMENTO = 'armazenamento_inadequado', 'Armazenamento inadequado'
        EXCESSO_COMPRA = 'excesso_de_compra', 'Excesso de compra'
        EXCESSO_PRODUCAO = 'excesso_de_producao', 'Excesso de produção'
        ERRO_PREPARO = 'erro_de_preparo', 'Erro de preparo'
        OUTRO = 'outro', 'Outro'

    # Guarda os registros de alimentos perdidos ou descartados.
    motivo = models.CharField(max_length=40, choices=Motivo.choices, default=Motivo.OUTRO)
    descricao = models.CharField(max_length=300, blank=True, default='')
    quantidade = models.DecimalField(max_digits=10, decimal_places=3)
    data = models.DateField()

    # Cada desperdício está ligado ao estoque relacionado ao item.
    estoque = models.ForeignKey(
        Estoque,
        on_delete=models.CASCADE,
        related_name='desperdicios'
    )

    # Também registra quem fez o registro, para auditoria e controle.
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='desperdicios'
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(motivo__in=[
                    'vencimento',
                    'armazenamento_inadequado',
                    'excesso_de_compra',
                    'excesso_de_producao',
                    'erro_de_preparo',
                    'outro',
                ]),
                name='desperdicio_motivo_conhecido',
                violation_error_message='O motivo do desperdício não faz parte da lista permitida.',
            ),
        ]

    def __str__(self):
        return f'{self.get_motivo_display()} - {self.quantidade}'

    def save(self, *args, **kwargs):
        """Na criação, só grava a perda se o lote cobrir a quantidade e então desconta o estoque."""
        if not self._state.adding:
            super().save(*args, **kwargs)
            return

        with transaction.atomic():
            consulta = Estoque.objects.filter(pk=self.estoque_id)
            if connection.features.has_select_for_update:
                consulta = consulta.select_for_update()
            estoque = consulta.get()
            quantidade = self.quantidade
            if quantidade is None or Decimal(quantidade) <= 0:
                raise ValidationError({'quantidade': 'Informe uma quantidade maior que zero.'})
            if Decimal(quantidade) > estoque.quantidade_atual:
                raise ValidationError({
                    'quantidade': 'A quantidade do desperdício não pode ser maior que a quantidade em estoque.',
                })
            super().save(*args, **kwargs)
            estoque.quantidade_atual -= Decimal(quantidade)
            estoque.save(update_fields=['quantidade_atual'])
