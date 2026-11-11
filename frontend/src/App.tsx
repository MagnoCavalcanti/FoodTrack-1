import { useEffect, useState, type FormEvent } from "react";
import foodTrackLogo from "./assets/foodtrack-logo.png";
import { listExpiryAlerts } from "./api/alertas";
import { listFoods, createFood } from "./api/alimentos";
import { login, logout as encerrarSessao } from "./api/autenticacao";
import { ApiError } from "./api/cliente";
import { listWaste, listWasteReasons, createWaste } from "./api/desperdicios";
import { listStocks, listExpiringStocks, listUsageOrder, createStock, updateStock } from "./api/estoques";
import { formatQuantity, intervaloDoMes, localDateString, rotuloDe } from "./api/formatacao";
import { getWasteReport } from "./api/relatorios";
import { listRestaurants, updateRestaurant, updateRestaurantSettings } from "./api/restaurantes";
import type { AlertaValidade } from "./api/tipos/alerta";
import type { FoodItem } from "./api/tipos/alimento";
import type { MotivoDesperdicio, WasteRecord } from "./api/tipos/desperdicio";
import type { EstoqueOrdenado, EstoqueProximo, StockItem } from "./api/tipos/estoque";
import type { RelatorioDesperdicio } from "./api/tipos/relatorio";
import type { Restaurant } from "./api/tipos/restaurante";
import { ROTULOS_PERFIL } from "./api/tipos/usuario";
import { getCurrentUser, listUsers, createUser } from "./api/usuarios";
import type { User } from "./api/tipos/usuario";
import {
  CreateFoodPage,
  DashboardPage,
  InventoryPage,
  LoadingPage,
  LoginPage,
  PriorityPage,
  ReportsPage,
  SettingsPage,
  WastePage,
} from "./pages/index";
import { Icon, type IconName } from "./pages/ui";
import type { ExpiringFood } from "./pages/types";

type RecursosCarregados = {
  user: User;
  users: User[];
  restaurants: Restaurant[];
  foods: FoodItem[];
  stocks: StockItem[];
  waste: WasteRecord[];
  expiringStocks: EstoqueProximo[];
  usageOrder: EstoqueOrdenado[];
  alerts: AlertaValidade[];
  motivos: MotivoDesperdicio[];
  relatorioMes: RelatorioDesperdicio;
};

/** Junta as consultas que as telas compartilham. Cada chamada permanece no setor da rota. */
async function carregarRecursos(token: string): Promise<RecursosCarregados> {
  const [user, users, restaurants, foods, stocks, waste, expiringStocks, usageOrder, alerts, motivos, relatorioMes] = await Promise.all([
    getCurrentUser(token),
    listUsers(token),
    listRestaurants(token),
    listFoods(token),
    listStocks(token),
    listWaste(token),
    listExpiringStocks(token),
    listUsageOrder(token),
    listExpiryAlerts(token),
    listWasteReasons(token),
    getWasteReport(token, { ...intervaloDoMes(), agrupar: "motivo" }),
  ]);
  return { user, users, restaurants, foods, stocks, waste, expiringStocks, usageOrder, alerts, motivos, relatorioMes };
}

/** Descreve o prazo de alerta usado nas mensagens, a partir da configuração do restaurante. */
function textoDoPrazo(user: User, restaurants: Restaurant[]) {
  const proprio = restaurants.find((item) => item.id === user.restaurante);
  if (proprio) return `até ${proprio.dias_alerta_validade} dia(s)`;
  if (restaurants.length === 1) return `até ${restaurants[0].dias_alerta_validade} dia(s)`;
  return "no prazo de alerta de cada restaurante";
}

const navigation: { label: string; icon: IconName }[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Estoque", icon: "box" },
  { label: "Cadastrar Alimento", icon: "plus" },
  { label: "Desperdícios", icon: "trash" },
  { label: "Relatórios", icon: "chart" },
  { label: "Configurações", icon: "settings" },
];

// Componente raiz: concentra sessão, dados compartilhados e navegação entre telas.
export default function App() {
  // Estado da interface e da tela atual.
  const [active, setActive] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [wasteModal, setWasteModal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [wasteForm, setWasteForm] = useState({ estoque: "", quantidade: "", motivo: "outro", descricao: "" });
  const [wasteError, setWasteError] = useState("");
  // A sessão é restaurada do armazenamento local quando a aplicação abre.
  const [token, setToken] = useState(() => window.localStorage.getItem("foodtrack-token") || "");
  const [username, setUsername] = useState(() => window.localStorage.getItem("foodtrack-username") || "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // Recursos carregados da API e compartilhados pelas páginas.
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [expiringStocks, setExpiringStocks] = useState<EstoqueProximo[]>([]);
  const [usageOrder, setUsageOrder] = useState<EstoqueOrdenado[]>([]);
  const [alerts, setAlerts] = useState<AlertaValidade[]>([]);
  const [motivos, setMotivos] = useState<MotivoDesperdicio[]>([]);
  const [relatorioMes, setRelatorioMes] = useState<RelatorioDesperdicio | null>(null);

  // Distribui a resposta de cada rota no estado compartilhado pelas telas.
  const aplicarRecursos = (resources: RecursosCarregados) => {
    setUser(resources.user);
    setRestaurants(resources.restaurants);
    setUsers(resources.users);
    setFoodItems(resources.foods);
    setStockItems(resources.stocks);
    setWasteRecords(resources.waste);
    setExpiringStocks(resources.expiringStocks);
    setUsageOrder(resources.usageOrder);
    setAlerts(resources.alerts);
    setMotivos(resources.motivos);
    setRelatorioMes(resources.relatorioMes);
  };

  // Recarrega os recursos após gravações. A conta atual vem de /api/usuarios/me/.
  const refreshResources = async (sessionToken = token) => {
    aplicarRecursos(await carregarRecursos(sessionToken));
  };

  // Carrega os dados quando há sessão; evita atualizar estado após desmontar o efeito.
  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    carregarRecursos(token)
      .then((resources) => {
        if (!active) return;
        aplicarRecursos(resources);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          window.localStorage.removeItem("foodtrack-token");
          window.localStorage.removeItem("foodtrack-username");
          setToken("");
          setLoadError("Sua sessão expirou. Entre novamente.");
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  // Exibe uma confirmação temporária na interface.
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  // Autentica na API e persiste token e username para restaurar a sessão.
  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    try {
      const result = await login(username, password);
      window.localStorage.setItem("foodtrack-token", result.token);
      window.localStorage.setItem("foodtrack-username", username);
      setPassword("");
      setActive("Dashboard");
      setToken(result.token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Não foi possível entrar.");
    }
  };

  // Revoga o token no servidor e só então apaga a sessão guardada no navegador.
  const logout = async () => {
    try {
      await encerrarSessao(token);
    } catch {
      // A sessão local é encerrada mesmo se o token já não existir no servidor.
    }
    window.localStorage.removeItem("foodtrack-token");
    window.localStorage.removeItem("foodtrack-username");
    setToken("");
    setUser(null);
    setStockItems([]);
    setFoodItems([]);
    setWasteRecords([]);
    setExpiringStocks([]);
    setUsageOrder([]);
    setAlerts([]);
    setMotivos([]);
    setRelatorioMes(null);
    setRestaurants([]);
    setUsers([]);
    setActive("Dashboard");
  };

  // Cadastro é composto por duas operações: primeiro alimento, depois estoque.
  const submitFood = async (data: { nome: string; categoria: string; medida: string; quantidade: string; validade: string; localizacao: string; restaurante?: number }) => {
    const food = await createFood(token, {
      nome: data.nome,
      categoria: data.categoria,
      medida: data.medida,
      ...(data.restaurante ? { restaurante: data.restaurante } : {}),
    });
    // O ID retornado ao criar o alimento é usado como relação do novo estoque.
    try {
      await createStock(token, {
        alimento: food.id,
        quantidade_atual: data.quantidade,
        entrada: localDateString(),
        localizacao: data.localizacao,
        validade: data.validade || null,
      });
    } catch (error) {
      let refreshMessage = "";
      // Mesmo se o estoque falhar, tenta refletir o alimento já criado na tela.
      try {
        await refreshResources();
      } catch (refreshError) {
        refreshMessage = ` A lista também não pôde ser atualizada: ${refreshError instanceof Error ? refreshError.message : "falha da API"}`;
      }
      throw new Error(`O alimento foi criado com ID ${food.id}, mas o estoque não foi salvo. Não repita o cadastro do alimento. Erro: ${error instanceof Error ? error.message : "falha da API"}.${refreshMessage}`);
    }
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`Alimento e estoque foram salvos, mas a atualização da tela falhou. Não repita o cadastro; recarregue os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Grava desperdício e sincroniza os recursos exibidos nas telas.
  const submitWaste = async (data: { motivo: string; descricao: string; quantidade: string; data: string; estoque: number }) => {
    await createWaste(token, data);
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O desperdício foi salvo, mas a atualização da tela falhou. Não repita o registro; recarregue os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Atualiza um estoque existente e recarrega os dados compartilhados.
  const saveStock = async (id: number, data: Partial<Omit<StockItem, "id">>) => {
    await updateStock(token, id, data);
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O estoque foi salvo, mas a atualização da tela falhou. Recarregue os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Cria usuário e atualiza a lista de equipe.
  const saveUser = async (data: { username: string; nome: string; email: string; perfil: string; password: string; restaurante?: number }) => {
    await createUser(token, data);
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O usuário foi criado, mas a atualização da tela falhou. Não repita o cadastro. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Atualiza dados do restaurante e sincroniza novamente as listas.
  const saveRestaurant = async (id: number, data: { nome: string; cnpj: string; dias_alerta_validade: number }) => {
    await updateRestaurant(token, id, data);
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O restaurante foi atualizado, mas a tela não pôde recarregar os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Grava só os dias de alerta na configuração do restaurante da conta.
  const saveRestaurantSettings = async (diasAlerta: number, restaurante?: number) => {
    const atualizado = await updateRestaurantSettings(token, { dias_alerta_validade: diasAlerta }, restaurante);
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O prazo de alerta foi salvo, mas a tela não pôde recarregar os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
    return atualizado;
  };

  // Sem token, somente o formulário de login é renderizado.
  if (!token) {
    return (
      <LoginPage
        username={username}
        password={password}
        loginError={loginError}
        loadError={loadError}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={submitLogin}
      />
    );
  }

  // Aguarda o carregamento ou apresenta falhas antes de mostrar o sistema.
  if (loading || !user || !relatorioMes) {
    return <LoadingPage loading={loading} loadError={loadError} onLogout={logout} />;
  }

  // Monta a visão do painel com a classificação que o servidor já calculou.
  const foodById = new Map(foodItems.map((food) => [food.id, food]));
  const prazoAlerta = textoDoPrazo(user, restaurants);
  const foodsExpiringToday: ExpiringFood[] = expiringStocks
    .map((stock) => {
      const categoryClass = stock.categoria.toLowerCase().includes("carne") ? "cat-red" : stock.categoria.toLowerCase().includes("pesc") ? "cat-blue" : stock.categoria.toLowerCase().includes("hort") ? "cat-green" : "cat-indigo";
      return {
        id: stock.id,
        name: stock.alimento_nome,
        category: stock.categoria.toUpperCase(),
        categoryClass,
        expiry: stock.situacao === "vencido" ? "Vencido" : stock.situacao === "hoje" ? "Vence hoje" : `Vence em ${stock.dias_restantes} dia(s)`,
        critical: stock.situacao === "vencido" || stock.situacao === "hoje",
        location: stock.localizacao,
        amount: `${formatQuantity(stock.quantidade_atual)} ${stock.medida}`,
      };
    })
    .filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(search.toLowerCase()));
  const expiringSoonCount = expiringStocks.filter((stock) => stock.situacao !== "vencido").length;
  const expiredCount = expiringStocks.filter((stock) => stock.situacao === "vencido").length;
  const wasteThisMonth = relatorioMes.total_registros;
  const notifications = alerts.slice(0, 5).map((alerta) => {
    const stock = stockItems.find((item) => item.id === alerta.estoque);
    const food = stock ? foodById.get(stock.alimento) : undefined;
    return {
      id: alerta.estoque,
      name: alerta.alimento,
      expiry: alerta.mensagem,
      critical: alerta.situacao === "vencido" || alerta.situacao === "hoje",
      location: alerta.localizacao,
      amount: `${formatQuantity(alerta.quantidade_atual)} ${food?.medida || ""}`.trim(),
    };
  });
  // Abre o formulário de desperdício, opcionalmente pré-selecionando um estoque.
  const openWaste = (stockId?: number) => {
    setWasteForm({
      estoque: stockId ? String(stockId) : "",
      quantidade: "",
      motivo: "outro",
      descricao: "",
    });
    setWasteError("");
    setWasteModal(true);
  };
  // Contrato comum passado às páginas de recursos.
  const pageProps = {
    page: active,
    navigate: setActive,
    notify,
    openWaste,
    user,
    users,
    token,
    restaurants,
    foods: foodItems,
    stocks: stockItems,
    waste: wasteRecords,
    expiringStocks,
    usageOrder,
    alerts,
    motivos,
    relatorioMes,
    prazoAlerta,
    saveFood: submitFood,
    saveStock,
    saveWaste: submitWaste,
    saveUser,
    saveRestaurant,
    saveRestaurantSettings,
  };

  // Estrutura compartilhada: menu lateral, cabeçalho, conteúdo e ações globais.
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      {mobileMenu && <button className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-[var(--line)] bg-white transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarCollapsed ? "lg:w-[84px]" : "lg:w-[268px]"} ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className={`flex items-center justify-between px-4 ${sidebarCollapsed ? "h-[82px] lg:justify-center" : "h-[104px]"}`}>
          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <img src={foodTrackLogo} alt="FoodTrack — Controle hoje, menos desperdício amanhã" className="h-[92px] w-[176px] object-contain" />
          </div>
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="hidden size-11 place-items-center rounded-xl bg-[var(--brand)] text-white shadow-[0_5px_16px_rgba(7,150,105,0.22)] transition hover:bg-[var(--brand-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] lg:grid"
              aria-label="Abrir menu lateral"
              aria-expanded="false"
              title="Abrir menu"
            >
              <Icon name="menu" size={21} />
            </button>
          )}
          <button onClick={() => setMobileMenu(false)} className="grid size-11 place-items-center text-[var(--muted)] lg:hidden" aria-label="Fechar navegação"><Icon name="close" /></button>
        </div>
        <div className={`group absolute -right-4 top-8 z-10 ${sidebarCollapsed ? "hidden" : "hidden lg:block"}`}>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="grid size-8 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--brand-dark)] shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition hover:scale-105 hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            aria-label="Recolher menu lateral"
            aria-expanded="true"
          >
            <Icon name="chevron" size={16} className="rotate-180 transition-transform duration-200" />
          </button>
          <span className="pointer-events-none absolute left-10 top-1/2 w-max -translate-y-1/2 translate-x-1 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:translate-x-0 group-hover:opacity-100">
            Recolher menu
          </span>
        </div>

        <nav className="mt-4 flex-1 px-4" aria-label="Navegação principal">
          <div className="space-y-1.5">
            {navigation.map((item) => (
              <button key={item.label} title={sidebarCollapsed ? item.label : undefined} onClick={() => { setActive(item.label); setMobileMenu(false); }} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-[0.95rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${sidebarCollapsed ? "lg:justify-center lg:gap-0 lg:px-0" : ""} ${active === item.label ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"}`}>
                <Icon name={item.icon} size={18} className={active === item.label ? "text-[var(--brand)]" : "text-[var(--icon)]"} />
                <span className={sidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className={`mx-4 mb-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)]/60 p-4 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--brand-dark)]"><span>Economia no Mês</span><Icon name="trend" size={16} /></div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{wasteThisMonth}</p>
          <p className="mt-1 text-xs text-[var(--brand)]">Registros de desperdício no mês</p>
        </div>
        <button onClick={() => notify("Central de suporte aberta")} title="Suporte & Documentação" className={`mx-5 mb-5 flex min-h-11 items-center gap-3 text-sm text-[var(--muted-strong)] ${sidebarCollapsed ? "lg:justify-center lg:gap-0" : ""}`}><Icon name="help" size={18} /> <span className={sidebarCollapsed ? "lg:hidden" : ""}>Suporte & Documentação</span></button>
      </aside>

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[268px]"}`}>
        <header className="sticky top-0 z-30 flex min-h-[74px] items-center gap-3 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur-md sm:px-6 xl:px-10">
          <button onClick={() => setMobileMenu(true)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] lg:hidden" aria-label="Abrir navegação"><Icon name="menu" /></button>
          <div className="relative min-w-0 flex-1 md:max-w-2xl">
            <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--icon)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] pl-11 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="Buscar insumo ou local..." aria-label="Buscar insumo ou local de armazenamento" />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="relative">
            <button onClick={() => setNotificationsOpen((current) => !current)} className={`relative grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted-strong)] transition ${notificationsOpen ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : ""}`} aria-label="Notificações de validade" aria-expanded={notificationsOpen}>
              <Icon name="bell" size={20} />
              {alerts.length > 0 && <span className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-[var(--danger)] text-[0.65rem] font-bold text-white">{alerts.length}</span>}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-14 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                  <div><h2 className="font-bold">Notificações</h2><p className="mt-0.5 text-xs text-[var(--muted)]">Alertas de validade do estoque</p></div>
                  <span className="text-xs text-[var(--muted)]">{alerts.length} alertas {prazoAlerta}</span>
                </div>
                <div className="max-h-[26rem] overflow-y-auto">
                  {notifications.map((food) => (
                    <button key={food.id} onClick={() => { setActive("Estoque"); setNotificationsOpen(false); }} className="flex min-h-[88px] w-full gap-3 border-b border-[var(--line)] px-5 py-4 text-left last:border-0 hover:bg-[var(--surface-soft)]">
                      <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${food.critical ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}><Icon name={food.critical ? "alert" : "calendar"} size={17} /></span>
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{food.name}</strong><span className={`mt-0.5 block text-xs font-bold ${food.critical ? "text-[var(--danger)]" : "text-[var(--warning)]"}`}>{food.expiry}</span><span className="mt-1 block text-xs text-[var(--muted)]">{food.amount} · {food.location}</span></span>
                    </button>
                  ))}
                  {notifications.length === 0 && <p className="p-5 text-sm text-[var(--muted-strong)]">Nenhum item com validade próxima.</p>}
                </div>
                <button onClick={() => { setActive("Prioridades"); setNotificationsOpen(false); }} className="min-h-11 w-full border-t border-[var(--line)] bg-[var(--surface-soft)] text-sm font-bold text-[var(--brand-dark)]">Ver todos os itens prioritários</button>
              </div>
            )}
          </div>
          <button onClick={logout} className="flex min-h-11 items-center gap-3 text-left" aria-label="Sair da conta">
            <span className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-slate-100 text-xs font-bold">{user.nome.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
            <span className="hidden sm:block"><strong className="block text-sm font-semibold">{user.nome}</strong><span className="block text-xs leading-tight text-[var(--muted)]">{rotuloDe(ROTULOS_PERFIL, user.perfil)} · Sair</span></span>
          </button>
          </div>
        </header>

        {/* A tela é escolhida pelo estado active; não há roteamento por URL aqui. */}
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 xl:px-10 xl:py-9">
          {active === "Dashboard" && (
            <DashboardPage
              foodsExpiringToday={foodsExpiringToday}
              prazoAlerta={prazoAlerta}
              expiringSoonCount={expiringSoonCount}
              expiredCount={expiredCount}
              wasteThisMonth={wasteThisMonth}
              foodCount={foodItems.length}
              stockCount={stockItems.length}
              stocksWithoutValidity={stockItems.filter((item) => !item.validade).length}
              categoryCount={new Set(foodItems.map((food) => food.categoria)).size}
              navigate={setActive}
              onRegisterWaste={openWaste}
            />
          )}
          {active === "Prioridades" && <PriorityPage {...pageProps} />}
          {active === "Estoque" && <InventoryPage {...pageProps} />}
          {active === "Cadastrar Alimento" && <CreateFoodPage {...pageProps} />}
          {active === "Desperdícios" && <WastePage {...pageProps} />}
          {active === "Relatórios" && <ReportsPage {...pageProps} />}
          {active === "Configurações" && <SettingsPage {...pageProps} />}
        </main>
      </div>

      {/* Modal compartilhado para registrar desperdícios a partir de diferentes telas. */}
      {wasteModal && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="waste-title">
          <form onSubmit={async (event) => {
            event.preventDefault();
            setWasteError("");
            try {
              await submitWaste({ motivo: wasteForm.motivo, descricao: wasteForm.descricao, quantidade: wasteForm.quantidade, data: localDateString(), estoque: Number(wasteForm.estoque) });
              setWasteModal(false);
              notify("Desperdício registrado.");
            } catch (error) {
              setWasteError(error instanceof Error ? error.message : "Não foi possível registrar o desperdício.");
            }
          }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="waste-title" className="text-2xl font-bold tracking-tight">Registrar desperdício</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">A quantidade registrada será descontada do lote escolhido.</p></div>
              <button type="button" onClick={() => setWasteModal(false)} className="grid size-11 place-items-center rounded-xl bg-[var(--surface-soft)]" aria-label="Fechar modal"><Icon name="close" /></button>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="field-label">Estoque *</span><select required value={wasteForm.estoque} onChange={(event) => setWasteForm((current) => ({ ...current, estoque: event.target.value }))} className="field"><option value="">Selecione um alimento e local</option>{stockItems.map((stock) => { const food = foodById.get(stock.alimento); return <option key={stock.id} value={stock.id}>{food?.nome || `Alimento ${stock.alimento}`} · {stock.localizacao} ({formatQuantity(stock.quantidade_atual)} {food?.medida || ""})</option>; })}</select></label>
              <label><span className="field-label">Quantidade *</span><input required value={wasteForm.quantidade} onChange={(event) => setWasteForm((current) => ({ ...current, quantidade: event.target.value }))} type="number" min="0.001" step="0.001" className="field" placeholder="0,0" /></label>
              <label><span className="field-label">Motivo *</span><select required value={wasteForm.motivo} onChange={(event) => setWasteForm((current) => ({ ...current, motivo: event.target.value }))} className="field">{motivos.map((motivo) => <option key={motivo.valor} value={motivo.valor}>{motivo.rotulo}</option>)}</select></label>
              <label className="sm:col-span-2"><span className="field-label">Descrição</span><input maxLength={300} value={wasteForm.descricao} onChange={(event) => setWasteForm((current) => ({ ...current, descricao: event.target.value }))} className="field" placeholder="Detalhe opcional da baixa" /></label>
            </div>
            {wasteError && <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{wasteError}</p>}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setWasteModal(false)} className="min-h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold">Cancelar</button>
              <button type="submit" className="min-h-11 rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white">Confirmar registro</button>
            </div>
          </form>
        </div>
      )}

      {/* Região acessível para confirmações temporárias das operações. */}
      {toast && <div aria-live="polite" className="fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[var(--ink)] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}
