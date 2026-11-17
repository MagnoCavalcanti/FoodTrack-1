/**
 * Cliente HTTP do FoodTrack.
 *
 * Todo acesso ao backend Django passa pela função `request` deste arquivo.
 * Os outros arquivos de `api/` (alimentos.ts, estoques.ts...) são só atalhos
 * que chamam `request` com a rota e o método certos.
 */

// Lê a URL do backend do arquivo .env (VITE_API_URL). Se não existir, usa "/api".
// O replace remove barras no final: "http://x/" vira "http://x".
const configuredApiUrl = (import.meta.env?.VITE_API_URL || "/api").replace(/\/+$/, "");

// Garante que a URL final termine em "/api":
// - caminho relativo ("/api") → usa como está;
// - URL que já termina em "/api" → usa como está;
// - URL só com o servidor ("http://127.0.0.1:8000") → acrescenta "/api".
const API_URL = configuredApiUrl.startsWith("/")
  ? configuredApiUrl
  : configuredApiUrl.endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl}/api`;

/** Erro da API com o status HTTP, ou zero quando a rede falha antes da resposta. */
export class ApiError extends Error {
  // Código HTTP da resposta (401, 404, 400...). Zero = nem chegou ao servidor.
  status: number;

  constructor(message: string, status: number) {
    super(message); // guarda a mensagem no Error padrão do JavaScript
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Monta a URL com os parâmetros preenchidos e omite os que vieram vazios.
 * Exemplo: comConsulta("desperdicios/", { data_inicio: "2026-11-01", motivo: "" })
 *          → "desperdicios/?data_inicio=2026-11-01"
 */
export function comConsulta(caminho: string, parametros: Record<string, string | number | null | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    // Pula filtros não informados para não mandar "?motivo=" vazio ao backend.
    if (valor === undefined || valor === null || valor === "") continue;
    busca.set(chave, String(valor));
  }
  const texto = busca.toString();
  // Só coloca o "?" quando sobrou algum parâmetro.
  return texto ? `${caminho}?${texto}` : caminho;
}

/**
 * Envia a requisição autenticada, lê o JSON e converte falhas em ApiError.
 *
 * @param path  rota relativa, ex.: "estoques/" ou "estoques/5/"
 * @param token token de login; quando informado vai no cabeçalho Authorization
 * @param init  opções do fetch (method, body...). Sem method, o fetch faz GET.
 * @returns     o JSON da resposta já tipado como T (o tipo é escolhido por quem chama)
 */
export async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    // Junta a base com a rota, removendo barras repetidas no começo da rota.
    response = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, {
      ...init,
      headers: {
        // Só declara JSON quando há corpo (POST/PATCH).
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        // Autenticação por token do Django REST Framework: "Token abc123".
        ...(token ? { Authorization: `Token ${token}` } : {}),
        // Cabeçalhos extras passados por quem chamou têm prioridade.
        ...init.headers,
      },
    });
  } catch {
    // O fetch só lança exceção quando a rede falha (backend desligado, URL errada, CORS).
    throw new ApiError(`Não foi possível acessar a API em ${API_URL}. Confira se o servidor de desenvolvimento e o backend estão ativos.`, 0);
  }

  // 204 = "No Content" (ex.: DELETE). Não há JSON para ler.
  if (response.status === 204) return undefined as T;

  // Tenta ler o JSON; se o corpo não for JSON, fica null em vez de quebrar.
  const body = await response.json().catch(() => null);

  // response.ok é true para status 200–299. Fora disso, é erro.
  if (!response.ok) {
    // O Django devolve erros assim: { "nome": ["Campo obrigatório."], "detail": "..." }.
    // Aqui isso vira um texto único: "nome: Campo obrigatório. ...".
    const message = typeof body === "object" && body !== null
      ? Object.entries(body).map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        // "detail" é a mensagem geral; não precisa mostrar o nome do campo.
        return field === "detail" ? text : `${field}: ${text}`;
      }).join(" ")
      : `A API respondeu com o status ${response.status}.`;
    throw new ApiError(message || `A API respondeu com o status ${response.status}.`, response.status);
  }

  // Sucesso: devolve o JSON com o tipo T pedido por quem chamou.
  return body as T;
}
