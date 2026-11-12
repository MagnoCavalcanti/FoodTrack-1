import { useEffect, useState, type FormEvent } from "react";
import { listExpiryAlerts } from "./api/alertas";
import { listFoods, createFood } from "./api/alimentos";
import { login, logout as encerrarSessao } from "./api/autenticacao";
import { ApiError } from "./api/cliente";
import { listWaste, listWasteReasons, createWaste, updateWaste, deleteWaste } from "./api/desperdicios";
import { listStocks, listExpiringStocks, listUsageOrder, createStock, updateStock } from "./api/estoques";
import { formatQuantity, intervaloDoMes, localDateString } from "./api/formatacao";
import { getWasteReport } from "./api/relatorios";
import { listRestaurants, updateRestaurant, updateRestaurantSettings } from "./api/restaurantes";
import type { AlertaValidade } from "./api/tipos/alerta";
import type { FoodItem } from "./api/tipos/alimento";
import type { MotivoDesperdicio, WasteRecord } from "./api/tipos/desperdicio";
import type { EstoqueOrdenado, EstoqueProximo, StockItem } from "./api/tipos/estoque";
import type { RelatorioDesperdicio } from "./api/tipos/relatorio";
import type { Restaurant } from "./api/tipos/restaurante";
import { getCurrentUser, listUsers, createUser } from "./api/usuarios";
import type { User } from "./api/tipos/usuario";
import { AppHeader } from "./components/AppHeader";
import CreateFoodPage from "./components/CreateFoodPage";
import DashboardPage from "./components/DashboardPage";
import InventoryPage from "./components/InventoryPage";
import LoadingPage from "./components/LoadingPage";
import LoginPage from "./components/LoginPage";
import PriorityPage from "./components/PriorityPage";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { WasteForm, quantidadeInicialDaBaixa } from "./components/WasteForm";
import WastePage from "./components/WastePage";
import type { ExpiringFood } from "./components/types";

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

  // O backend só desconta o lote na criação da baixa. Na edição e na exclusão,
  // o frontend devolve ao lote a quantidade antiga e desconta a nova.
  // As contas usam milésimos inteiros para evitar erro de ponto flutuante.
  const emMilesimos = (valor: string) => Math.round(Number(valor) * 1000);
  const deMilesimos = (valor: number) => (valor / 1000).toFixed(3);
  const saldosAtuais = async () => {
    const lotes = await listStocks(token);
    return new Map(lotes.map((lote) => [lote.id, emMilesimos(lote.quantidade_atual)]));
  };
  const avisoDeAjuste = (acao: string, error: unknown) => new Error(`O desperdício foi ${acao}, mas o saldo do lote não pôde ser ajustado. Confira a quantidade no Estoque. Erro: ${error instanceof Error ? error.message : "falha da API"}`);

  // Edita uma baixa e reajusta o saldo do lote (ou dos dois lotes, se ele mudou).
  const editWaste = async (original: WasteRecord, data: { motivo: string; descricao: string; quantidade: string; data: string; estoque: number }) => {
    const saldos = await saldosAtuais();
    const antiga = emMilesimos(original.quantidade);
    const nova = emMilesimos(data.quantidade);
    const mesmoLote = original.estoque === data.estoque;
    const saldoDestino = saldos.get(data.estoque);
    if (saldoDestino === undefined) throw new Error("O lote escolhido não foi encontrado.");
    const disponivel = mesmoLote ? saldoDestino + antiga : saldoDestino;
    if (nova > disponivel) throw new Error(`A quantidade não pode ser maior que o saldo disponível no lote (${formatQuantity(deMilesimos(disponivel))}).`);

    await updateWaste(token, original.id, data);
    try {
      if (mesmoLote) {
        if (nova !== antiga) await updateStock(token, data.estoque, { quantidade_atual: deMilesimos(saldoDestino + antiga - nova) });
      } else {
        const saldoOrigem = saldos.get(original.estoque);
        if (saldoOrigem !== undefined) await updateStock(token, original.estoque, { quantidade_atual: deMilesimos(saldoOrigem + antiga) });
        await updateStock(token, data.estoque, { quantidade_atual: deMilesimos(saldoDestino - nova) });
      }
    } catch (error) {
      await refreshResources().catch(() => undefined);
      throw avisoDeAjuste("atualizado", error);
    }
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O desperdício foi atualizado, mas a atualização da tela falhou. Recarregue os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Exclui uma baixa e devolve a quantidade ao lote.
  const removeWaste = async (record: WasteRecord) => {
    const saldos = await saldosAtuais();
    await deleteWaste(token, record.id);
    try {
      const saldo = saldos.get(record.estoque);
      if (saldo !== undefined) await updateStock(token, record.estoque, { quantidade_atual: deMilesimos(saldo + emMilesimos(record.quantidade)) });
    } catch (error) {
      await refreshResources().catch(() => undefined);
      throw avisoDeAjuste("excluído", error);
    }
    try {
      await refreshResources();
    } catch (error) {
      throw new Error(`O desperdício foi excluído, mas a atualização da tela falhou. Recarregue os dados. Erro: ${error instanceof Error ? error.message : "falha da API"}`);
    }
  };

  // Atualiza um estoque existente e recarrega os dados compartilhados.
  const saveStock =async (id: number, data: Partial<Omit<StockItem, "id">>) => {
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
    const lote = stockId ? stockItems.find((stock) => stock.id === stockId) : undefined;
    const saldo = lote ? Number(lote.quantidade_atual) : Number.NaN;
    const medida = lote ? foodItems.find((food) => food.id === lote.alimento)?.medida : undefined;
    setWasteForm({
      estoque: stockId ? String(stockId) : "",
      quantidade: quantidadeInicialDaBaixa(saldo, medida),
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
    updateWaste: editWaste,
    removeWaste,
    saveUser,
    saveRestaurant,
    saveRestaurantSettings,
  };

  // Estrutura compartilhada: menu lateral, cabeçalho, conteúdo e ações globais.
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenu}
        active={active}
        wasteThisMonth={wasteThisMonth}
        onNavigate={(label) => { setActive(label); setMobileMenu(false); }}
        onCloseMobile={() => setMobileMenu(false)}
        onCollapse={() => setSidebarCollapsed(true)}
        onExpand={() => setSidebarCollapsed(false)}
        onSupport={() => notify("Central de suporte aberta")}
      />

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[268px]"}`}>
        <AppHeader
          search={search}
          onSearch={setSearch}
          onOpenMenu={() => setMobileMenu(true)}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => setNotificationsOpen((current) => !current)}
          alertCount={alerts.length}
          prazoAlerta={prazoAlerta}
          notifications={notifications}
          onOpenStock={() => { setActive("Estoque"); setNotificationsOpen(false); }}
          onOpenPriorities={() => { setActive("Prioridades"); setNotificationsOpen(false); }}
          userName={user.nome}
          userProfile={user.perfil}
          onLogout={logout}
        />
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

      {wasteModal && (
        <WasteForm
          foods={foodItems}
          stocks={stockItems}
          motivos={motivos}
          form={wasteForm}
          error={wasteError}
          onChange={setWasteForm}
          onError={setWasteError}
          onClose={() => setWasteModal(false)}
          onSubmit={submitWaste}
          onSaved={() => { setWasteModal(false); notify("Desperdício registrado."); }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
