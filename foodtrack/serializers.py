from rest_framework import serializers

from .escopo import filtrar_por_restaurante
from .models import CNPJ_MASCARA, MENSAGEM_CNPJ, Alimento, Desperdicio, Estoque, Restaurante, Usuario, mascarar_cnpj


def usuario_da_requisicao(serializer):
    """Obtém a conta autenticada do contexto DRF, se houver requisição."""
    request = serializer.context.get('request')
    if request is None:
        return None
    return getattr(request, 'user', None)


def usuario_comum(user):
    """Indica se as regras de escopo devem tratar a conta como usuário comum."""
    # Sem usuário autenticado (geração do schema, por exemplo) o contrato fica completo.
    # A restrição de empresa só vale para quem já entrou e não é superusuário.
    return bool(user and user.is_authenticated and not user.is_superuser)


class RestauranteSerializer(serializers.ModelSerializer):
    """Valida e serializa os campos públicos de restaurante."""

    class Meta:
        model = Restaurante
        fields = ['id', 'nome', 'cnpj', 'dias_alerta_validade']

    def validate_cnpj(self, valor):
        mascarado = mascarar_cnpj(valor)
        if not CNPJ_MASCARA.fullmatch(mascarado or ''):
            raise serializers.ValidationError(MENSAGEM_CNPJ)
        return mascarado


class UsuarioSerializer(serializers.ModelSerializer):
    """Aplica as regras de criação, atualização e escopo das contas."""

    # A senha não volta no JSON. set_password grava o hash.
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'nome',
            'email',
            'perfil',
            'restaurante',
            'is_superuser',
            'password',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is None:
            self.fields['password'].required = True

        user = usuario_da_requisicao(self)
        # Quem não é superusuário não escolhe empresa nem promove outra conta.
        if usuario_comum(user):
            self.fields['restaurante'].read_only = True
            self.fields['is_superuser'].read_only = True
            return

        self.fields['restaurante'].required = False
        self.fields['restaurante'].allow_null = True

    def validate(self, attrs):
        user = usuario_da_requisicao(self)
        if usuario_comum(user):
            attrs['restaurante'] = user.restaurante
            attrs['is_superuser'] = False
            self.conferir_perfil(attrs, is_superuser=False)
            return attrs

        is_superuser = attrs.get(
            'is_superuser',
            self.instance.is_superuser if self.instance else False,
        )
        self.conferir_perfil(attrs, is_superuser)
        if 'restaurante' in attrs:
            restaurante = attrs['restaurante']
        elif self.instance is not None:
            restaurante = self.instance.restaurante
        else:
            restaurante = None

        if not is_superuser and restaurante is None:
            raise serializers.ValidationError({
                'restaurante': 'Usuários que não são superusuários precisam estar atrelados a um restaurante.',
            })

        if self.instance is not None and self.instance.pk and restaurante is not None:
            conflito = self.instance.desperdicios.exclude(
                estoque__alimento__restaurante=restaurante
            ).exists()
            if conflito:
                raise serializers.ValidationError({
                    'restaurante': 'Este usuário já registrou desperdício em outro restaurante e não pode ser movido.',
                })
        return attrs

    def conferir_perfil(self, attrs, is_superuser):
        """Impede perfis inconsistentes ou privilégios administrativos indevidos."""
        if is_superuser:
            attrs['perfil'] = Usuario.Perfil.SUPERUSER
            return
        if 'perfil' in attrs:
            perfil = attrs['perfil']
        elif self.instance is not None:
            perfil = self.instance.perfil
        else:
            perfil = None
        if perfil == Usuario.Perfil.SUPERUSER:
            raise serializers.ValidationError({
                'perfil': 'O perfil de administrador do site é exclusivo do superusuário.',
            })

    def create(self, validated_data):
        """Cria o usuário armazenando a senha pelo mecanismo de hash do Django."""
        senha = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.set_password(senha)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        """Atualiza campos e troca a senha somente quando ela foi enviada."""
        senha = validated_data.pop('password', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if senha:
            instance.set_password(senha)
        instance.save()
        return instance


class AlimentoSerializer(serializers.ModelSerializer):
    """Associa alimentos ao restaurante da conta comum autenticada."""

    class Meta:
        model = Alimento
        fields = ['id', 'nome', 'categoria', 'medida', 'restaurante']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # A chave existe no JSON de resposta, mas usuário comum não a envia.
        if usuario_comum(usuario_da_requisicao(self)):
            self.fields['restaurante'].read_only = True

    def validate(self, attrs):
        user = usuario_da_requisicao(self)
        if usuario_comum(user):
            attrs['restaurante'] = user.restaurante
        return attrs


class EstoqueSerializer(serializers.ModelSerializer):
    """Valida que o alimento escolhido pertence ao escopo do usuário."""

    class Meta:
        model = Estoque
        fields = [
            'id',
            'alimento',
            'quantidade_atual',
            'entrada',
            'saida',
            'localizacao',
            'validade',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Estoque liga em alimento, e alimento liga em restaurante.
        user = usuario_da_requisicao(self)
        if not user or not user.is_authenticated:
            return
        self.fields['alimento'].queryset = filtrar_por_restaurante(
            Alimento.objects.all(),
            user,
            'restaurante',
        )


class DesperdicioSerializer(serializers.ModelSerializer):
    """Valida o estoque e define automaticamente o autor do registro."""

    class Meta:
        model = Desperdicio
        fields = ['id', 'motivo', 'descricao', 'quantidade', 'data', 'estoque', 'usuario']
        extra_kwargs = {
            'usuario': {'read_only': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # O estoque precisa ser de um alimento do restaurante de quem lançou.
        user = usuario_da_requisicao(self)
        if not user or not user.is_authenticated:
            return
        self.fields['estoque'].queryset = filtrar_por_restaurante(
            Estoque.objects.all(),
            user,
            'alimento__restaurante',
        )

    def validate_estoque(self, estoque):
        user = usuario_da_requisicao(self)
        if not usuario_comum(user) or estoque is None:
            return estoque
        if estoque.alimento.restaurante_id != user.restaurante_id:
            raise serializers.ValidationError('Esse estoque não pertence ao seu restaurante.')
        return estoque

    def create(self, validated_data):
        # O autor é quem está autenticado. Na edição o usuario original permanece,
        # porque o campo é somente leitura e o update não mexe nele.
        validated_data['usuario'] = usuario_da_requisicao(self)
        return super().create(validated_data)
