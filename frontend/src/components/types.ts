/**
 * Tipos compartilhados entre o App.tsx e as páginas.
 *
 * O mais importante é PageProps: é o "contrato" entre o App e cada tela.
 * O App monta um único objeto com esses campos (pageProps) e entrega a todas
 * as páginas. Cada página pega só o que precisa, por desestruturação:
 *   export default function WastePage({ waste, stocks, notify }: PageProps)
 */
import type { AlertaValidade } from "../api/tipos/alerta";
import type { FoodItem } from "../api/tipos/alimento";
import type { MotivoDesperdicio, WasteRecord } from "../api/tipos/desperdicio";
import type { EstoqueOrdenado, EstoqueProximo, StockItem } from "../api/tipos/estoque";
import type { RelatorioDesperdicio } from "../api/tipos/relatorio";
import type { ConfiguracaoRestaurante, Restaurant } from "../api/tipos/restaurante";
import type { User } from "../api/tipos/usuario";

/**
 * Lote próximo do vencimento já formatado para o cartão do Dashboard.
 * O App converte EstoqueProximo (formato da API) neste formato (formato da tela).
 */
export type ExpiringFood = {
  id: number;            // id do lote
  name: string;          // nome do alimento
  category: string;      // categoria em MAIÚSCULAS
  categoryClass: string; // classe de cor: "cat-red", "cat-blue", "cat-green" ou "cat-indigo"
  expiry: string;        // texto, ex.: "Vence hoje"
  critical: boolean;     // true se vencido ou vence hoje (fica vermelho)
  location: string;
  amount: string;        // quantidade + medida, ex.: "2,5 Kg"
};

export type PageProps = {
  // ---------- Navegação e avisos ----------
  page: string;                              // nome da tela atual
  navigate: (page: string) => void;          // troca de tela, ex.: navigate("Estoque")
  notify: (message: string) => void;         // mostra o Toast de confirmação
  openWaste: (stockId?: number) => void;     // abre o modal de registrar desperdício

  // ---------- Dados carregados da API (somente leitura nas páginas) ----------
  user: User;                                // conta logada
  restaurants: Restaurant[];
  users: User[];
  token: string;                             // para páginas que fazem consultas próprias
  foods: FoodItem[];
  stocks: StockItem[];
  waste: WasteRecord[];
  expiringStocks: EstoqueProximo[];          // lotes dentro do prazo de alerta
  usageOrder: EstoqueOrdenado[];             // fila "usar primeiro"
  alerts: AlertaValidade[];
  motivos: MotivoDesperdicio[];
  relatorioMes: RelatorioDesperdicio;        // relatório do mês agrupado por motivo
  prazoAlerta: string;                       // texto pronto, ex.: "até 3 dia(s)"

  // ---------- Ações de gravação (implementadas no App.tsx) ----------
  // Todas devolvem Promise: a página usa await e, se der erro, mostra a mensagem.
  // Depois de gravar, o App recarrega os dados, e as páginas recebem as listas novas.
  saveFood: (data: { nome: string; categoria: string; medida: string; quantidade: string; validade: string; localizacao: string; restaurante?: number }) => Promise<void>;
  saveStock: (id: number, data: Partial<Omit<StockItem, "id">>) => Promise<void>;
  saveWaste: (data: { motivo: string; descricao: string; quantidade: string; data: string; estoque: number }) => Promise<void>;
  updateWaste: (original: WasteRecord, data: { motivo: string; descricao: string; quantidade: string; data: string; estoque: number }) => Promise<void>;
  removeWaste: (record: WasteRecord) => Promise<void>;
  saveUser:(data: { username: string; nome: string; email: string; perfil: string; password: string; restaurante?: number }) => Promise<void>;
  saveRestaurant: (id: number, data: { nome: string; cnpj: string; dias_alerta_validade: number }) => Promise<void>;
  saveRestaurantSettings: (diasAlerta: number, restaurante?: number) => Promise<ConfiguracaoRestaurante>;
};
