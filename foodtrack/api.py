from datetime import date

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .consultas import alertas_de_validade, ordem_de_utilizacao, proximos_do_vencimento, relatorio_desperdicio
from .escopo import filtrar_por_restaurante
from .models import Alimento, Desperdicio, Estoque, Restaurante, Usuario
from .serializers import (
    AlimentoSerializer,
    DesperdicioSerializer,
    EstoqueSerializer,
    RestauranteSerializer,
    UsuarioSerializer,
)

AGRUPAMENTOS_RELATORIO = ('motivo', 'alimento', 'categoria', 'dia')


# Permissões próprias do domínio: vínculo, perfil de gestão e administração global.
class ExigeVinculo(BasePermission):
    """Usuário comum só usa a API se já estiver ligado a um restaurante.

    Superusuário passa mesmo sem empresa: é assim que o createsuperuser existe.
    """

    message = 'Sua conta precisa estar vinculada a um restaurante.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.restaurante_id is not None


class GestaoEscreve(BasePermission):
    """Consulta é de quem está no restaurante. Gravar cadastro é de proprietário ou gerente."""

    message = 'Somente proprietário ou gerente pode alterar este recurso.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.perfil in (Usuario.Perfil.PROPRIETARIO, Usuario.Perfil.GERENTE)


class SomenteSuperusuarioEscreve(BasePermission):
    """Consultar restaurante é de quem está logado. Gravar é só do superusuário."""

    message = 'Somente superusuários podem gerenciar restaurantes.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_superuser


class TokenRespostaSerializer(serializers.Serializer):
    """Descreve o formato JSON devolvido ao autenticar."""

    token = serializers.CharField()


class ObterTokenView(ObtainAuthToken):
    """Troca usuário e senha pela chave enviada em Authorization."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        responses={200: TokenRespostaSerializer},
        auth=[],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class SaudeSerializer(serializers.Serializer):
    """Formato mínimo da resposta pública de saúde."""

    status = serializers.CharField()


class MotivoOpcaoSerializer(serializers.Serializer):
    """Representa uma opção de motivo para o cliente."""

# uma opção de motivo de desperdício

    valor = serializers.CharField()
    rotulo = serializers.CharField()


class AlertaValidadeSerializer(serializers.Serializer):
    """Campos que compõem cada alerta de validade."""

    situacao = serializers.CharField()
    mensagem = serializers.CharField()
    dias_restantes = serializers.IntegerField()
    estoque = serializers.IntegerField()
    alimento = serializers.CharField()
    validade = serializers.DateField()
    localizacao = serializers.CharField()
    quantidade_atual = serializers.DecimalField(max_digits=10, decimal_places=3)


class GrupoRelatorioSerializer(serializers.Serializer):
    """Formato de um grupo agregado do relatório de desperdícios."""

    chave = serializers.CharField()
    rotulo = serializers.CharField()
    registros = serializers.IntegerField()
    quantidade = serializers.CharField()
    percentual = serializers.CharField()


class RelatorioDesperdicioSerializer(serializers.Serializer):
    """Formato da resposta completa do relatório."""

    data_inicio = serializers.DateField(allow_null=True)
    data_fim = serializers.DateField(allow_null=True)
    agrupar = serializers.CharField()
    total_registros = serializers.IntegerField()
    quantidade_total = serializers.CharField()
    grupos = GrupoRelatorioSerializer(many=True)


class EncerrarSessaoView(APIView):
    """Apaga o token de quem está autenticado."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        # Revogar o token no servidor invalida futuras requisições que o utilizem.
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaudeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = SaudeSerializer

    @extend_schema(auth=[], responses={200: SaudeSerializer})
    def get(self, request):
        # Endpoint público simples para verificar se a API está respondendo.
        return Response({'status': 'ok'})


def ler_data(nome, valor):
    """Converte parâmetro ISO em date e transforma erros em validação HTTP."""
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({nome: 'Use a data no formato AAAA-MM-DD.'}) from None


def ler_inteiro(nome, valor):
    """Converte parâmetros inteiros opcionais em valores Python."""
    if valor in (None, ''):
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise ValidationError({nome: 'Informe um número inteiro.'}) from None


def ler_dias(valor):
    """Valida o limite opcional de antecedência dos alertas."""
    if valor in (None, ''):
        return None
    dias = ler_inteiro('dias', valor)
    if dias < 0 or dias > 365:
        raise ValidationError({'dias': 'Informe um número de 0 a 365.'})
    return dias


class RestauranteViewSet(ModelViewSet):
    """CRUD de restaurantes, com escrita reservada ao superusuário."""

    queryset = Restaurante.objects.all()
    serializer_class = RestauranteSerializer
    permission_classes = [IsAuthenticated, ExigeVinculo, SomenteSuperusuarioEscreve]

    def get_queryset(self):
        # pk = o próprio restaurante do usuário. Superusuário vê todos.
        return filtrar_por_restaurante(
            Restaurante.objects.all(), self.request.user, 'pk'
        ).order_by('nome')


class UsuarioViewSet(ModelViewSet):
    """CRUD de usuários, limitado ao restaurante, com rota para a conta atual."""

    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, ExigeVinculo, GestaoEscreve]

    @extend_schema(responses={200: UsuarioSerializer})
    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(self.get_serializer(request.user).data)

    def get_queryset(self):
        qs = Usuario.objects.select_related('restaurante')
        if not self.request.user.is_superuser:
            qs = qs.filter(is_superuser=False)
        return filtrar_por_restaurante(qs, self.request.user, 'restaurante').order_by('username')

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise PermissionDenied('Você não pode excluir o próprio usuário.')
        instance.delete()


class AlimentoViewSet(ModelViewSet):
    """CRUD de alimentos do restaurante visível ao usuário."""

    queryset = Alimento.objects.all()
    serializer_class = AlimentoSerializer
    permission_classes = [IsAuthenticated, ExigeVinculo, GestaoEscreve]

    def get_queryset(self):
        # Alimento guarda a foreign key do restaurante direto.
        qs = Alimento.objects.select_related('restaurante')
        return filtrar_por_restaurante(qs, self.request.user, 'restaurante').order_by('nome')


class EstoqueViewSet(ModelViewSet):
    """CRUD de estoques e ações de validade e ordem de utilização."""

    queryset = Estoque.objects.all()
    serializer_class = EstoqueSerializer
    permission_classes = [IsAuthenticated, ExigeVinculo, GestaoEscreve]

    @extend_schema(parameters=[OpenApiParameter('dias', int, description='Substitui os dias de alerta do restaurante.')])
    @action(detail=False, methods=['get'], url_path='proximos-vencimento')
    def proximos_vencimento(self, request):
        dias = ler_dias(request.query_params.get('dias'))
        return Response(proximos_do_vencimento(request.user, date.today(), dias))

    @action(detail=False, methods=['get'], url_path='ordem-utilizacao')
    def ordem_utilizacao(self, request):
        return Response(ordem_de_utilizacao(request.user))

    def get_queryset(self):
        # Estoque não tem restaurante. O filtro sobe para alimento__restaurante.
        qs = Estoque.objects.select_related('alimento__restaurante')
        return filtrar_por_restaurante(
            qs, self.request.user, 'alimento__restaurante'
        ).order_by('-entrada', 'alimento__nome')


class DesperdicioViewSet(ModelViewSet):
    """CRUD do histórico de desperdícios com filtros por query string."""

    queryset = Desperdicio.objects.all()
    serializer_class = DesperdicioSerializer
    permission_classes = [IsAuthenticated, ExigeVinculo]

    @extend_schema(responses={200: MotivoOpcaoSerializer(many=True)})
    @action(detail=False, methods=['get'])
    def motivos(self, request):
        return Response([
            {'valor': valor, 'rotulo': rotulo}
            for valor, rotulo in Desperdicio.Motivo.choices
        ])

    def get_queryset(self):
        # A empresa do desperdício é a do alimento daquele estoque.
        qs = Desperdicio.objects.select_related('estoque__alimento__restaurante', 'usuario')
        qs = filtrar_por_restaurante(
            qs, self.request.user, 'estoque__alimento__restaurante'
        )
        parametros = self.request.query_params
        inicio = ler_data('data_inicio', parametros.get('data_inicio'))
        fim = ler_data('data_fim', parametros.get('data_fim'))
        if inicio is not None:
            qs = qs.filter(data__gte=inicio)
        if fim is not None:
            qs = qs.filter(data__lte=fim)
        motivo = parametros.get('motivo')
        if motivo:
            if motivo not in Desperdicio.Motivo.values:
                raise ValidationError({'motivo': 'Motivo desconhecido.'})
            qs = qs.filter(motivo=motivo)
        usuario = ler_inteiro('usuario', parametros.get('usuario'))
        if usuario is not None:
            qs = qs.filter(usuario_id=usuario)
        estoque = ler_inteiro('estoque', parametros.get('estoque'))
        if estoque is not None:
            qs = qs.filter(estoque_id=estoque)
        return qs.order_by('-data', '-pk')


class AlertaValidadeView(APIView):
    """Expõe alertas calculados para os estoques do usuário."""

    permission_classes = [IsAuthenticated, ExigeVinculo]
    serializer_class = AlertaValidadeSerializer

    @extend_schema(parameters=[OpenApiParameter('dias', int)], responses={200: AlertaValidadeSerializer(many=True)})
    def get(self, request):
        dias = ler_dias(request.query_params.get('dias'))
        return Response(alertas_de_validade(request.user, date.today(), dias))


class RelatorioDesperdicioView(APIView):
    """Valida os filtros do relatório e delega o cálculo às consultas."""

    permission_classes = [IsAuthenticated, ExigeVinculo]
    serializer_class = RelatorioDesperdicioSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter('data_inicio', str),
            OpenApiParameter('data_fim', str),
            OpenApiParameter('agrupar', str, enum=list(AGRUPAMENTOS_RELATORIO)),
        ],
        responses={200: RelatorioDesperdicioSerializer},
    )
    def get(self, request):
        agrupar = request.query_params.get('agrupar') or 'motivo'
        if agrupar not in AGRUPAMENTOS_RELATORIO:
            raise ValidationError({'agrupar': 'Use motivo, alimento, categoria ou dia.'})
        return Response(relatorio_desperdicio(
            request.user,
            ler_data('data_inicio', request.query_params.get('data_inicio')),
            ler_data('data_fim', request.query_params.get('data_fim')),
            agrupar,
        ))


class ConfiguracaoRestauranteSerializer(serializers.ModelSerializer):
    """Expõe somente a configuração de antecedência do alerta."""

    class Meta:
        model = Restaurante
        fields = ['id', 'nome', 'dias_alerta_validade']
        read_only_fields = ['id', 'nome']


class ConfiguracaoRestauranteView(APIView):
    """Consulta ou atualiza a configuração do restaurante selecionado."""

    permission_classes = [IsAuthenticated, ExigeVinculo, GestaoEscreve]

    def restaurante_alvo(self, request):
        if request.user.is_superuser:
            informado = request.query_params.get('restaurante')
            if informado:
                return get_object_or_404(Restaurante, pk=informado)
            if request.user.restaurante_id:
                return request.user.restaurante
            raise ValidationError({'restaurante': 'Informe o restaurante.'})
        return request.user.restaurante

    @extend_schema(responses={200: ConfiguracaoRestauranteSerializer})
    def get(self, request):
        return Response(ConfiguracaoRestauranteSerializer(self.restaurante_alvo(request)).data)

    @extend_schema(
        request=ConfiguracaoRestauranteSerializer,
        responses={200: ConfiguracaoRestauranteSerializer},
    )
    def patch(self, request):
        restaurante = self.restaurante_alvo(request)
        serializer = ConfiguracaoRestauranteSerializer(restaurante, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
