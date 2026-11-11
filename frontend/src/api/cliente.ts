const configuredApiUrl = (import.meta.env?.VITE_API_URL || "/api").replace(/\/+$/, "");
const API_URL = configuredApiUrl.startsWith("/")
  ? configuredApiUrl
  : configuredApiUrl.endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl}/api`;

/** Erro da API com o status HTTP, ou zero quando a rede falha antes da resposta. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Monta a URL com os parâmetros preenchidos e omite os que vieram vazios. */
export function comConsulta(caminho: string, parametros: Record<string, string | number | null | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    busca.set(chave, String(valor));
  }
  const texto = busca.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/** Envia a requisição autenticada, lê o JSON e converte falhas em ApiError. */
export async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(`Não foi possível acessar a API em ${API_URL}. Confira se o servidor de desenvolvimento e o backend estão ativos.`, 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === "object" && body !== null
      ? Object.entries(body).map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        return field === "detail" ? text : `${field}: ${text}`;
      }).join(" ")
      : `A API respondeu com o status ${response.status}.`;
    throw new ApiError(message || `A API respondeu com o status ${response.status}.`, response.status);
  }

  return body as T;
}
