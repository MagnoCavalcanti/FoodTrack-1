import { rotuloDe } from "../api/formatacao";
import { ROTULOS_PERFIL } from "../api/tipos/usuario";
import { Icon } from "./Icon";

export type NotificacaoValidade = {
  id: number;
  name: string;
  expiry: string;
  critical: boolean;
  location: string;
  amount: string;
};

type AppHeaderProps = {
  search: string;
  onSearch: (value: string) => void;
  onOpenMenu: () => void;
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  alertCount: number;
  prazoAlerta: string;
  notifications: NotificacaoValidade[];
  onOpenStock: () => void;
  onOpenPriorities: () => void;
  userName: string;
  userProfile: string;
  onLogout: () => void;
};

/** Cabeçalho com busca, alertas de validade e a conta autenticada. */
export function AppHeader({ search, onSearch, onOpenMenu, notificationsOpen, onToggleNotifications, alertCount, prazoAlerta, notifications, onOpenStock, onOpenPriorities, userName, userProfile, onLogout }: AppHeaderProps) {
  const iniciais = userName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex min-h-[74px] items-center gap-3 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur-md sm:px-6 xl:px-10">
      <button onClick={onOpenMenu} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] lg:hidden" aria-label="Abrir navegação"><Icon name="menu" /></button>
      <div className="relative min-w-0 flex-1 md:max-w-2xl">
        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--icon)]" />
        <input value={search} onChange={(event) => onSearch(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] pl-11 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" placeholder="Buscar insumo ou local..." aria-label="Buscar insumo ou local de armazenamento" />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="relative">
          <button onClick={onToggleNotifications} className={`relative grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted-strong)] transition ${notificationsOpen ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : ""}`} aria-label="Notificações de validade" aria-expanded={notificationsOpen}>
            <Icon name="bell" size={20} />
            {alertCount > 0 && <span className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-[var(--danger)] text-[0.65rem] font-bold text-white">{alertCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-14 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div><h2 className="font-bold">Notificações</h2><p className="mt-0.5 text-xs text-[var(--muted)]">Alertas de validade do estoque</p></div>
                <span className="text-xs text-[var(--muted)]">{alertCount} alertas {prazoAlerta}</span>
              </div>
              <div className="max-h-[26rem] overflow-y-auto">
                {notifications.map((food) => (
                  <button key={food.id} onClick={onOpenStock} className="flex min-h-[88px] w-full gap-3 border-b border-[var(--line)] px-5 py-4 text-left last:border-0 hover:bg-[var(--surface-soft)]">
                    <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${food.critical ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}><Icon name={food.critical ? "alert" : "calendar"} size={17} /></span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{food.name}</strong><span className={`mt-0.5 block text-xs font-bold ${food.critical ? "text-[var(--danger)]" : "text-[var(--warning)]"}`}>{food.expiry}</span><span className="mt-1 block text-xs text-[var(--muted)]">{food.amount} · {food.location}</span></span>
                  </button>
                ))}
                {notifications.length === 0 && <p className="p-5 text-sm text-[var(--muted-strong)]">Nenhum item com validade próxima.</p>}
              </div>
              <button onClick={onOpenPriorities} className="min-h-11 w-full border-t border-[var(--line)] bg-[var(--surface-soft)] text-sm font-bold text-[var(--brand-dark)]">Ver todos os itens prioritários</button>
            </div>
          )}
        </div>
        <button onClick={onLogout} className="flex min-h-11 items-center gap-3 text-left" aria-label="Sair da conta">
          <span className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-slate-100 text-xs font-bold">{iniciais}</span>
          <span className="hidden sm:block"><strong className="block text-sm font-semibold">{userName}</strong><span className="block text-xs leading-tight text-[var(--muted)]">{rotuloDe(ROTULOS_PERFIL, userProfile)} · Sair</span></span>
        </button>
      </div>
    </header>
  );
}
