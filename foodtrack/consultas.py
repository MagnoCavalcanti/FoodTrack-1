from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import F

from .escopo import filtrar_por_restaurante
from .models import Desperdicio, Estoque


def estoques_visiveis(user):
    """Retorna estoques restritos ao restaurante do usuário."""
    return filtrar_por_restaurante(
        Estoque.objects.select_related('alimento__restaurante'),
        user,
        'alimento__restaurante',
    )


def desperdicios_visiveis(user):
    """Retorna desperdícios restritos pelo restaurante do estoque associado."""
    return filtrar_por_restaurante(
        Desperdicio.objects.select_related('estoque__alimento__restaurante', 'usuario'),
        user,
        'estoque__alimento__restaurante',
    )


def classificar_validade(estoque, hoje, dias_override=None):
    """Devolve a situação e os dias restantes, ou None quando o item não entra no alerta."""
    if estoque.validade is None:
        return None
    dias_restantes = (estoque.validade - hoje).days
    limite = estoque.alimento.restaurante.dias_alerta_validade if dias_override is None else dias_override
    if dias_restantes < 0:
        situacao = 'vencido'
    elif dias_restantes == 0:
        situacao = 'hoje'
    elif dias_restantes <= limite:
        situacao = 'proximo'
    else:
        return None
    return situacao, dias_restantes


def representar_estoque(estoque, **extras):
    """Monta o formato compartilhado pelas respostas de estoque calculadas."""
    return {
        'id': estoque.id,
        'alimento': estoque.alimento_id,
        'alimento_nome': estoque.alimento.nome,
        'categoria': estoque.alimento.categoria,
        'medida': estoque.alimento.medida,
        'quantidade_atual': estoque.quantidade_atual,
        'entrada': estoque.entrada,
        'saida': estoque.saida,
        'localizacao': estoque.localizacao,
        'validade': estoque.validade,
        'restaurante': estoque.alimento.restaurante_id,
        **extras,
    }


def proximos_do_vencimento(user, hoje, dias_override=None):
    """Seleciona estoques positivos dentro do limite de validade, incluindo vencidos."""
    itens = []
    consulta = (
        estoques_visiveis(user)
        .exclude(validade=None)
        .filter(quantidade_atual__gt=0)
        .order_by('validade', 'entrada', 'alimento__nome')
    )
    for estoque in consulta:
        classificacao = classificar_validade(estoque, hoje, dias_override)
        if classificacao is None:
            continue
        situacao, dias_restantes = classificacao
        itens.append(representar_estoque(
            estoque,
            situacao=situacao,
            dias_restantes=dias_restantes,
        ))
    return itens


def alertas_de_validade(user, hoje, dias_override=None):
    """Converte estoques próximos em mensagens adequadas para a API."""
    alertas = []
    for item in proximos_do_vencimento(user, hoje, dias_override):
        alertas.append({
            'situacao': item['situacao'],
            'mensagem': mensagem_alerta_texto(
                item['alimento_nome'],
                item['localizacao'],
                item['situacao'],
                item['dias_restantes'],
            ),
            'dias_restantes': item['dias_restantes'],
            'estoque': item['id'],
            'alimento': item['alimento_nome'],
            'validade': item['validade'],
            'localizacao': item['localizacao'],
            'quantidade_atual': item['quantidade_atual'],
        })
    return alertas


def mensagem_alerta_texto(nome, localizacao, situacao, dias_restantes):
    """Gera uma frase para o estado de validade informado."""
    if situacao == 'vencido':
        return f'{nome} venceu há {abs(dias_restantes)} dia(s) em {localizacao}.'
    if situacao == 'hoje':
        return f'{nome} vence hoje em {localizacao}.'
    return f'{nome} vence em {dias_restantes} dia(s) em {localizacao}.'


def ordem_de_utilizacao(user):
    """Ordena estoques positivos para priorizar validade mais próxima."""
    consulta = (
        estoques_visiveis(user)
        .filter(quantidade_atual__gt=0)
        .order_by(F('validade').asc(nulls_last=True), 'entrada', 'alimento__nome', 'pk')
    )
    return [
        representar_estoque(estoque, posicao=posicao)
        for posicao, estoque in enumerate(consulta, start=1)
    ]


def relatorio_desperdicio(user, data_inicio, data_fim, agrupar):
    """Agrupa desperdícios visíveis no período e calcula totais e percentuais."""
    consulta = desperdicios_visiveis(user)
    if data_inicio is not None:
        consulta = consulta.filter(data__gte=data_inicio)
    if data_fim is not None:
        consulta = consulta.filter(data__lte=data_fim)

    registros = list(consulta)
    total = sum((registro.quantidade for registro in registros), Decimal('0'))
    grupos = {}
    for registro in registros:
        chave, rotulo = chave_do_grupo(registro, agrupar)
        grupo = grupos.setdefault(chave, {
            'chave': chave,
            'rotulo': rotulo,
            'registros': 0,
            'quantidade': Decimal('0'),
        })
        grupo['registros'] += 1
        grupo['quantidade'] += registro.quantidade

    lista = []
    for grupo in grupos.values():
        if total:
            percentual = (grupo['quantidade'] / total * Decimal('100')).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )
        else:
            percentual = Decimal('0.00')
        grupo['quantidade'] = format(grupo['quantidade'], 'f')
        grupo['percentual'] = format(percentual, 'f')
        lista.append(grupo)
    lista.sort(key=lambda grupo: (Decimal(grupo['quantidade']) * -1, str(grupo['chave'])))
    return {
        'data_inicio': data_inicio,
        'data_fim': data_fim,
        'agrupar': agrupar,
        'total_registros': len(registros),
        'quantidade_total': format(total, 'f'),
        'grupos': lista,
    }


def chave_do_grupo(registro, agrupar):
    """Obtém a chave e o rótulo conforme o agrupamento escolhido."""
    if agrupar == 'alimento':
        alimento = registro.estoque.alimento
        return str(alimento.pk), alimento.nome
    if agrupar == 'categoria':
        categoria = registro.estoque.alimento.categoria
        return categoria, categoria
    if agrupar == 'dia':
        iso = registro.data.isoformat()
        return iso, iso
    rotulo = dict(Desperdicio.Motivo.choices).get(registro.motivo, registro.motivo)
    return registro.motivo, rotulo
