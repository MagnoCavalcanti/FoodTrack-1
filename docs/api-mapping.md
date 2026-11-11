# Mapeamento da API para o frontend

Este documento descreve o backend existente em `openapi.yaml`, `foodtrack/models.py`,
`foodtrack/serializers.py`, `foodtrack/api.py`, `foodtrack/urls.py`,
`foodtrack/escopo.py` e `config/settings.py`. Os caminhos abaixo são relativos à
origem do backend e incluem a barra final.

## Autenticação e permissões

### Obter token

`POST /api/token/` é público e recebe `username` (string, obrigatório) e `password`
(string, obrigatório). Aceita JSON, `application/x-www-form-urlencoded` ou multipart.
A resposta `200` tem o formato:

```json
{
  "token": "chave-de-autenticacao"
}
```

Envie o token nas chamadas autenticadas como:

```http
Authorization: Token chave-de-autenticacao
```

O esquema é `Token`, não `Bearer`. Não existe endpoint `me`/`whoami`, nem o token
retorna os dados do usuário. Para obter nome e perfil, use o `username` informado
no login para localizar o próprio registro na lista `GET /api/usuarios/`; a resposta
desse recurso inclui `username`, `nome` e `perfil`. Usuário comum vê os usuários do
próprio restaurante; superusuário vê usuários de todos os restaurantes, inclusive
superusuários.

### Regras de acesso

- O padrão do DRF em `settings.py` exige autenticação (`IsAuthenticated`). A exceção
  explícita é `POST /api/token/`. `GET /api/schema/`, `GET /api/swagger/` e
  `GET /api/docs/` também são públicos.
- Nas rotas de recursos, além do login, `ExigeVinculo` exige que usuários comuns
  estejam vinculados a um restaurante. Superusuário pode não ter vínculo.
- Usuário comum só consulta e altera os dados associados ao próprio restaurante.
  O escopo de estoques e desperdícios é aplicado pela relação estoque → alimento →
  restaurante. Superusuário não tem esse filtro.
- Restaurantes podem ser consultados por usuários autenticados, mas criação,
  alteração e exclusão exigem superusuário.
- Usuário comum não pode escolher o restaurante nem promover contas a superusuário
  ao criar/alterar usuários; esses campos são ignorados na validação e o registro
  fica no restaurante do usuário autenticado. Usuário comum não pode excluir a
  própria conta.
- As relações nos JSONs são representadas por IDs inteiros, não por objetos
  aninhados. Senhas nunca são retornadas.

## Endpoints e contratos

Todas as rotas de recursos abaixo são registradas por `DefaultRouter` e oferecem:

| Caminho | Métodos | Resposta |
|---|---|---|
| `/api/{recurso}/` | `GET` lista; `POST` cria | Lista JSON ou objeto criado (`201`) |
| `/api/{recurso}/{id}/` | `GET` detalhe; `PUT` substitui; `PATCH` altera parcialmente; `DELETE` exclui | Objeto JSON, ou sem corpo (`204`) na exclusão |

`id` é inteiro. Em `POST` e `PUT`, os campos obrigatórios indicados adiante são
necessários; `PATCH` aceita qualquer subconjunto de campos graváveis. `PUT` espera
o conjunto completo de campos obrigatórios. Os campos `id` e outros indicados como
somente leitura não são graváveis.

### Filtros, ordenação, busca e paginação

Nenhum viewset configura filtros por query string, busca, campos de ordenação ou
paginação. Não há parâmetros `search`, `ordering`, `page`, categoria ou status
implementados. Cada `GET` de lista devolve um array JSON sem envelope de paginação,
mesmo quando vazio; a paginação da interface precisaria ser feita no cliente.

A API aplica somente ordenações fixas:

| Recurso | Ordenação fixa |
|---|---|
| Restaurantes | `nome` crescente |
| Usuários | `username` crescente |
| Alimentos | `nome` crescente |
| Estoques | `entrada` decrescente e, em seguida, nome do alimento crescente |
| Desperdícios | `data` decrescente e, em seguida, ID decrescente |

### Restaurantes — `/api/restaurantes/`

Permissão: usuário autenticado e vinculado a um restaurante ou superusuário.
Usuário comum só lista/consulta o próprio restaurante; apenas superusuário pode
criar, alterar ou excluir restaurantes.

| Campo | Tipo | Entrada / obrigatoriedade | Saída |
|---|---|---|---|
| `id` | inteiro | Somente leitura | Obrigatório |
| `nome` | string, até 150 caracteres | Obrigatório em criação e substituição | Sempre |
| `cnpj` | string mascarada `00.000.000/0000-00`, única | Obrigatório. Dígitos sem máscara são gravados no formato mascarado | Sempre |
| `dias_alerta_validade` | inteiro de 0 a 365 | Opcional; o padrão é 3 | Sempre |

### Usuários — `/api/usuarios/`

Permissão: usuário autenticado e vinculado ou superusuário. Usuário comum lista e
consulta usuários não-superusuários do próprio restaurante. Superusuário pode
gerenciar usuários de todos os restaurantes. Usuário comum não pode excluir a si
mesmo.

| Campo | Tipo | Entrada / obrigatoriedade | Saída |
|---|---|---|---|
| `id` | inteiro | Somente leitura | Obrigatório |
| `username` | string, até 150 caracteres (`[\w.@+-]+`) | Obrigatório em criação e substituição | Sempre |
| `nome` | string, até 150 caracteres | Obrigatório em criação e substituição | Sempre |
| `email` | string de e-mail, até 254 caracteres, único | Obrigatório em criação e substituição | Sempre |
| `perfil` | enum: `proprietario`, `gerente`, `funcionario` | Obrigatório em criação e substituição | Sempre |
| `restaurante` | inteiro ou `null` | Superusuário pode informar ou omitir; para usuário comum é preenchido com o restaurante autenticado. Um usuário não-superusuário precisa ter restaurante. | Sempre; `null` é possível para superusuário |
| `is_superuser` | booleano | Opcional; usuário comum não pode defini-lo e a conta criada por ele fica como `false` | Sempre |
| `password` | string | Obrigatório na criação; opcional na alteração. Gravado com hash. | Nunca (somente escrita) |

### Alimentos — `/api/alimentos/`

Permissão: usuário autenticado e vinculado ou superusuário. Usuário comum só acessa
alimentos do próprio restaurante. Para usuário comum, `restaurante` é preenchido
automaticamente e não deve ser enviado; superusuário deve informar o restaurante.

| Campo | Tipo | Entrada / obrigatoriedade | Saída |
|---|---|---|---|
| `id` | inteiro | Somente leitura | Obrigatório |
| `nome` | string, até 150 caracteres | Obrigatório em criação e substituição | Sempre |
| `categoria` | string, até 60 caracteres | Obrigatório em criação e substituição | Sempre |
| `medida` | enum: `Kg`, `g`, `L`, `ml`, `un`, `maço`, `caixa` | Obrigatório em criação e substituição | Sempre |
| `restaurante` | inteiro | Obrigatório para superusuário em criação; usuário comum tem o campo preenchido pelo servidor | Sempre |

### Estoques — `/api/estoques/`

Permissão: usuário autenticado e vinculado ou superusuário. O `alimento` informado
deve pertencer ao restaurante do usuário comum.

| Campo | Tipo | Entrada / obrigatoriedade | Saída |
|---|---|---|---|
| `id` | inteiro | Somente leitura | Obrigatório |
| `alimento` | inteiro (ID de alimento) | Obrigatório em criação e substituição | Sempre |
| `quantidade_atual` | decimal | Obrigatório em criação e substituição | Sempre |
| `entrada` | data (`YYYY-MM-DD`) | Obrigatório em criação e substituição | Sempre |
| `saida` | data (`YYYY-MM-DD`) ou `null` | Opcional; aceita `null` | Sempre; pode ser `null` |
| `localizacao` | string, até 150 caracteres | Obrigatório em criação e substituição | Sempre |
| `validade` | data (`YYYY-MM-DD`) ou `null` | Opcional; aceita `null` | Sempre; pode ser `null` |

### Desperdícios — `/api/desperdicios/`

Permissão: usuário autenticado e vinculado ou superusuário. `estoque` deve pertencer
ao restaurante do usuário comum. O campo `usuario` é definido pelo usuário
autenticado, não pode ser informado para atribuir o registro a outra pessoa e é
mantido na edição.

| Campo | Tipo | Entrada / obrigatoriedade | Saída |
|---|---|---|---|
| `id` | inteiro | Somente leitura | Obrigatório |
| `motivo` | enum: `vencimento`, `armazenamento_inadequado`, `excesso_de_compra`, `excesso_de_producao`, `erro_de_preparo`, `outro` | Opcional; o padrão é `outro` | Sempre |
| `descricao` | string, até 300 caracteres | Opcional; observação livre | Sempre |
| `quantidade` | decimal | Obrigatório em criação e substituição | Sempre |
| `data` | data (`YYYY-MM-DD`) | Obrigatório em criação e substituição | Sempre |
| `estoque` | inteiro (ID de estoque) | Obrigatório em criação e substituição | Sempre |
| `usuario` | inteiro (ID de usuário) | Somente leitura; preenchido pelo servidor com o usuário autenticado | Sempre |

### Outros caminhos

| Caminho | Métodos / acesso | Formato |
|---|---|---|
| `/api/usuarios/me/` | `GET`, autenticado | Usuário logado, perfil e restaurante |
| `/api/logout/` | `POST`, autenticado | Apaga o token da sessão |
| `/api/estoques/proximos-vencimento/` | `GET`, autenticado. `dias` opcional, de 0 a 365 | Itens vencidos, que vencem hoje ou dentro da antecedência, com `situacao` e `dias_restantes` |
| `/api/estoques/ordem-utilizacao/` | `GET`, autenticado | Estoque com quantidade maior que zero, do que vence primeiro para o que não tem validade |
| `/api/alertas/validade/` | `GET`, autenticado. `dias` opcional | Mensagens de alerta de validade do restaurante |
| `/api/desperdicios/motivos/` | `GET`, autenticado | Lista fechada de motivos |
| `/api/desperdicios/` | `GET` aceita `data_inicio`, `data_fim`, `motivo`, `usuario` e `estoque` | Histórico filtrado. A gravação continua aberta ao funcionário |
| `/api/relatorios/desperdicios/` | `GET`, autenticado. `data_inicio`, `data_fim` e `agrupar` (`motivo`, `alimento`, `categoria` ou `dia`) | Totais, quantidade e percentual de cada grupo |
| `/api/restaurantes/me/configuracao/` | `GET` autenticado; `PATCH` só proprietário, gerente ou superusuário | `dias_alerta_validade` do próprio restaurante. Superusuário sem vínculo informa `?restaurante=` |
| `/api/saude/` | `GET`, público | `{"status": "ok"}` |
| `/api/schema/` | `GET`, público e sem autenticação | Esquema OpenAPI (usado para gerar o `openapi.yaml`) |
| `/api/swagger/` | `GET`, público e sem autenticação | Interface Swagger UI |
| `/api/docs/` | `GET`, público e sem autenticação | Documentação da API (ReDoc) |
| `/admin/` | Interface administrativa do Django; fora da API REST | HTML do Django Admin |

O schema OpenAPI exportável exclui `/api/schema/`, `/api/swagger/`, `/api/docs/` e a administração Django.
Proprietário e gerente gravam alimentos, estoques e usuários. Funcionário consulta esses recursos e registra desperdício.

## Mapeamento das telas

“Calculável” abaixo significa que os dados necessários existem nas respostas
atuais; ainda pode ser necessário combinar listas e relações por ID no frontend.
Dados de estoque podem ser relacionados a alimento por `Estoque.alimento`; o
alimento contém `nome`, `categoria`, `medida` e `restaurante`. Desperdícios se
relacionam ao estoque por `Desperdicio.estoque`.

| Tela | Dado exibido | Endpoint e campo(s) | Fonte / cálculo |
|---|---|---|---|
| Header | Busca global | Nenhum | **SEM FONTE NA API**; não há busca global nem busca parametrizada. |
| Header | Contador de notificações de validade | `GET /api/estoques/`: `validade` | A API fornece validade dos estoques, mas não possui endpoint de notificações; a contagem pode ser calculada no cliente. |
| Header | Nome e cargo do usuário logado | `GET /api/usuarios/`: `username`, `nome`, `perfil` | **Calculável** após localizar o registro pelo `username` usado no login. Não existe endpoint `me`. |
| Dashboard | Data atual | Nenhum | **Calculável no frontend** com o relógio local; não vem da API. |
| Dashboard | Total de alimentos ativos e novos na semana | `GET /api/alimentos/` fornece apenas `id`, `nome`, `categoria`, `medida`, `restaurante` | Contagem total é possível, mas “ativos” não tem campo de status; novos na semana não é possível porque não há `created_at`. **SEM FONTE** para esses critérios. |
| Dashboard | Itens que vencem em até 3 dias e perda estimada em R$ | Estoque fornece `validade`, `quantidade_atual` e alimento relacionado; não há custo nem preço | Validade e quantidade podem ser calculadas; perda estimada em R$ **SEM FONTE NA API**. |
| Dashboard | Alimentos vencidos | `GET /api/estoques/`: `validade` | **Calculável** comparando a validade com a data atual. |
| Dashboard | Desperdício do mês em kg | `GET /api/desperdicios/`: `data`, `quantidade`, `estoque`; por estoque, `alimento.medida` | **Parcialmente calculável** filtrando os registros pela data e somando quantidades de medidas compatíveis. As unidades são enumeradas, mas não há conversão automática entre elas ou para unidades de item. |
| Dashboard | Desperdício do mês em R$ | Nenhum campo de custo/preço | **SEM FONTE NA API**. |
| Dashboard | Variação vs. mês anterior | `Desperdicio.data`, `quantidade` | **Parcialmente calculável** como variação de quantidades nos dois períodos, sujeito à mesma limitação de unidade; variação financeira não é possível. |
| Dashboard | Alimentos que vencem hoje: categoria, nome, validade, local, quantidade/unidade, perda estimada, sugestão de uso | `GET /api/estoques/` fornece `validade`, `quantidade_atual`, `localizacao`; `GET /api/alimentos/` fornece nome, categoria e `medida` | **Parcial**: os campos disponíveis podem ser combinados e filtrados pela data; perda estimada e sugestão de uso não têm fonte na API. |
| Dashboard | Status do estoque (percentual e contagem em dia/atenção/crítico) | `GET /api/estoques/`: `quantidade_atual` | **SEM FONTE** para status/limiares e percentuais; não existem estoque mínimo nem regras de criticidade. |
| Dashboard | Acurácia de inventário | Nenhum | **SEM FONTE NA API**; não há quantidade contada nem comparação com quantidade esperada. |
| Dashboard | Motivos de perdas (percentual por motivo) | `GET /api/desperdicios/`: `descricao` | Pode-se agrupar texto de `descricao` como aproximação, mas não há campo ou vocabulário controlado de motivo. **Sem fonte confiável** para percentual por motivo. |
| Dashboard | Economia do mês | Nenhum | **SEM FONTE NA API**; não existem dados de economia nem de aproveitamento evitado. |
| Estoque | Total de itens | `GET /api/estoques/`: `id`, `quantidade_atual` | **Calculável**, contando registros/linhas de estoque ou somando `quantidade_atual`; a tela precisa definir qual dos dois significa “itens”. |
| Estoque | Total de categorias | `GET /api/estoques/` + `GET /api/alimentos/`: `categoria` | **Calculável** contando categorias distintas dos alimentos associados aos estoques. |
| Estoque | Valor em estoque | Nenhum custo/preço em alimento ou estoque | **SEM FONTE NA API**. |
| Estoque | Itens com estoque baixo | `quantidade_atual` | **SEM FONTE NA API** para estoque mínimo ou status. |
| Estoque | Próximos do vencimento | `GET /api/estoques/`: `validade` | **Calculável** comparando a validade com a data atual. |
| Estoque | Tabela: alimento, categoria, quantidade/unidade, localização | `GET /api/estoques/` + alimento relacionado: `nome`, `categoria`, `quantidade_atual`, `medida`, `localizacao` | **Disponível** ao combinar `alimento` com `id` do alimento. |
| Estoque | Tabela: validade e status | `GET /api/estoques/`: `validade` | Validade disponível; status/limiares não têm fonte na API. |
| Estoque | Filtros por categoria e status | Nenhum parâmetro de filtro | **SEM FONTE NA API** para filtros no servidor; o frontend poderia filtrar em memória a lista carregada por categoria, mas não há status. |
| Estoque | Paginação | Listagem retorna array sem paginação | **SEM PAGINAÇÃO NA API**; paginação local no frontend é possível após carregar todos os resultados. |
| Cadastrar Alimento | Nome, categoria, unidade | `POST /api/alimentos/`: `nome`, `categoria`, `medida` | **Disponível**; o nome do campo para unidade no contrato é `medida`. |
| Cadastrar Alimento | Validade do estoque | `POST /api/estoques/`: `validade` | **Disponível**; validade pertence ao estoque, não ao alimento. Fornecedor, custo unitário, lote e estoque mínimo não fazem parte do modelo. |
| Cadastrar Alimento | Quantidade inicial e local de armazenamento | `POST /api/estoques/`: `alimento`, `quantidade_atual`, `entrada`, `localizacao` | **Parcialmente disponível** em recurso separado após criar o alimento. `entrada` (data de entrada) é obrigatória; não equivale a validade. |
| Desperdícios | Desperdício do mês em kg | `GET /api/desperdicios/`: `data`, `quantidade`, `estoque`; relação para `alimento.medida` | **Parcialmente calculável** por período e soma de quantidades homogêneas; kg normalizado requer medidas compatíveis/conversão. |
| Desperdícios | Custo das perdas | Nenhum campo de custo | **SEM FONTE NA API**. |
| Desperdícios | Meta mensal | Nenhum campo de meta | **SEM FONTE NA API**. |
| Desperdícios | Principal motivo | `GET /api/desperdicios/`: `descricao` | Descrição é texto livre e não há classificação de motivo; apenas agrupamento textual aproximado. |
| Desperdícios | Economia gerada | Nenhum | **SEM FONTE NA API**. |
| Desperdícios | Histórico: data e hora | `Desperdicio.data` | **Parcial**: há somente data (`DateField`), sem hora. |
| Desperdícios | Histórico: alimento e quantidade | `Desperdicio.estoque` → estoque `alimento` → alimento `nome`; `quantidade` | **Disponível** mediante combinação de respostas. |
| Desperdícios | Histórico: motivo | `Desperdicio.descricao` | **Parcial**: há descrição livre, não um campo de motivo padronizado. |
| Desperdícios | Histórico: custo estimado | Nenhum | **SEM FONTE NA API**. |
| Desperdícios | Histórico: responsável | `Desperdicio.usuario` → `GET /api/usuarios/`: `nome` | **Disponível** ao combinar IDs; `usuario` é atribuído pelo backend no registro. |
| Desperdícios | Filtros por período e motivo | Nenhum parâmetro de filtro | **SEM FONTE NA API**; filtragem local dos registros disponíveis é possível por data ou texto da descrição. |
| Desperdícios | Registrar desperdício | `POST /api/desperdicios/`: `descricao`, `quantidade`, `data`, `estoque` | **Disponível**. O usuário é preenchido pelo servidor. A criação desconta `quantidade` de `Estoque.quantidade_atual` do lote. Quantidade maior que a disponível ou menor ou igual a zero é recusada com HTTP 400. |
| Itens Prioritários | Lista ordenada por validade | `GET /api/estoques/`: `validade` | **Calculável** no cliente; a ordenação fixa da API permanece por data de entrada. |
| Itens Prioritários | Categoria, quantidade e perda estimada | Estoque/alimento fornecem `validade`, `categoria`, `quantidade_atual` e `medida` | Categoria, quantidade e ordenação por validade são possíveis; perda estimada não pode ser obtida sem custo. |
| Itens Prioritários | Sugestão de uso | Nenhum | **SEM FONTE NA API**. |
| Itens Prioritários | Ação “usar no preparo” | Nenhum endpoint/ação de consumo | **SEM FONTE NA API**. |
| Itens Prioritários | Ação “registrar baixa” | `POST /api/desperdicios/` registra a perda e desconta a quantidade do lote | A baixa usa o lote escolhido. Quantidade acima do estoque atual é recusada. |
| Relatórios | Economia gerada, desperdício evitado em kg, itens aproveitados, acurácia do estoque | Nenhum campo/endpoint para economia, itens aproveitados ou contagem de inventário | **SEM FONTE NA API**; quantidade de desperdício bruto tem somente a limitação de unidade descrita acima. |
| Relatórios | Desperdício por semana (4 semanas) | `GET /api/desperdicios/`: `data`, `quantidade` | **Parcialmente calculável** agrupando por semana no frontend; não há agregação backend e a soma em kg depende de unidades compatíveis. |
| Relatórios | Economia por categoria | Nenhum custo ou economia; categoria existe em alimento | **SEM FONTE NA API** para economia; categoria isolada não basta para calculá-la. |
| Configurações | Restaurante: nome e CNPJ | `GET /api/restaurantes/`: `nome`, `cnpj` | **Disponível**. Atualização via `PATCH /api/restaurantes/{id}/` existe, mas só superusuário pode escrever. |
| Configurações | Restaurante: telefone, e-mail, cidade, fuso horário | Nenhum desses campos em `Restaurante` | **SEM FONTE NA API**. |
| Configurações | Dias de aviso antes do vencimento e moeda | Nenhum campo/configuração | **SEM FONTE NA API**. |
| Configurações | Usuário: nome e perfil | `GET /api/usuarios/`: `nome`, `perfil` | **Disponível** após identificar o registro pelo username do login. Não há endpoint específico para perfil atual. |

## Campos alinhados ao modelo lógico

O modelo de estoque inclui `validade`, exposta também pela API. `medida` é uma
escolha limitada às unidades `Kg`, `g`, `L`, `ml`, `un`, `maço` e `caixa`.
Fornecedor, estoque mínimo, lote e custo unitário não fazem
parte do modelo lógico implementado.

## Pendências do backend

- Criar endpoint de usuário atual (`me`) ou incluir identidade no token, se o frontend
  precisar identificar o usuário sem comparar o username usado no login.
- Definir campos/entidades para endereço e contato do restaurante (telefone,
  e-mail, cidade, fuso horário) e configurações de moeda e dias de aviso de validade.
- Definir de forma estruturada custo estimado, metas, economia gerada, desperdício
  evitado, itens aproveitados e horário do evento.
- Definir fluxo de baixa/consumo que atualize o estoque de forma consistente,
  incluindo o comportamento de `POST /api/desperdicios/`.
- Adicionar dados e regras de inventário (contagem observada e acurácia) e uma
  sugestão de uso, que não decorre automaticamente dos campos da primeira etapa.
- Implementar endpoints de resumo/relatórios para contagens, agregações temporais,
  notificações de validade e métricas do dashboard.
- Implementar filtros server-side por categoria, status e período,
  busca global e parâmetros de ordenação conforme as telas.
- Implementar paginação na API se as listas precisarem suportar grandes volumes
  sem carregar todos os registros no cliente.
