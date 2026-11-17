import foodTrackLogo from "../assets/foodtrack-logo.png";
import { Icon, type IconName } from "./Icon";

/**
 * Itens do menu. O "label" também é o nome da tela: clicar em "Estoque" chama
 * onNavigate("Estoque"), e o App mostra a tela cujo nome é igual a esse texto.
 * Obs.: "Prioridades" não está aqui; ela abre pelo sino de notificações.
 */
const navigation: { label: string; icon: IconName }[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Estoque", icon: "box" },
  { label: "Cadastrar Alimento", icon: "plus" },
  { label: "Desperdícios", icon: "trash" },
  { label: "Relatórios", icon: "chart" },
  { label: "Configurações", icon: "settings" },
];

type SidebarProps = {
  collapsed: boolean;      // desktop: menu recolhido (só ícones, 84px)
  mobileOpen: boolean;     // celular: menu aberto por cima da tela
  active: string;          // tela atual, para destacar o item
  wasteThisMonth: number;  // número mostrado no cartão verde do rodapé
  onNavigate: (label: string) => void;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  onSupport: () => void;
};

/**
 * Menu lateral com a navegação principal e o resumo do mês.
 *
 * Comportamento responsivo (o prefixo "lg:" do Tailwind = telas ≥ 1024px):
 * - Celular: o menu fica escondido fora da tela (-translate-x-full) e desliza
 *   para dentro quando mobileOpen = true.
 * - Desktop: o menu fica sempre visível (lg:translate-x-0), largo (268px) ou
 *   recolhido (84px), conforme "collapsed".
 */
export function Sidebar({ collapsed, mobileOpen, active, wasteThisMonth, onNavigate, onCloseMobile, onCollapse, onExpand, onSupport }: SidebarProps) {
  return (
    <>
      {/* Celular: fundo escuro atrás do menu aberto. Clicar nele fecha o menu. */}
      {mobileOpen && <button className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" aria-label="Fechar menu" onClick={onCloseMobile} />}
      {/* O painel do menu. A largura e a posição mudam conforme collapsed e mobileOpen. */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-[var(--line)] bg-white transition-[width,transform] duration-200 lg:translate-x-0 ${collapsed ? "lg:w-[84px]" : "lg:w-[268px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* ---------- Topo: logo e botões de abrir/fechar ---------- */}
        <div className={`flex items-center justify-between px-4 ${collapsed ? "h-[82px] lg:justify-center" : "h-[104px]"}`}>
          {/* Logo: some no desktop quando o menu está recolhido */}
          <div className={collapsed ? "lg:hidden" : ""}>
            <img src={foodTrackLogo} alt="FoodTrack — Controle hoje, menos desperdício amanhã" className="h-[92px] w-[176px] object-contain" />
          </div>
          {/* Desktop recolhido: botão verde de "hambúrguer" para expandir o menu */}
          {collapsed && (
            <button
              onClick={onExpand}
              className="hidden size-11 place-items-center rounded-xl bg-[var(--brand)] text-white shadow-[0_5px_16px_rgba(7,150,105,0.22)] transition hover:bg-[var(--brand-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] lg:grid"
              aria-label="Abrir menu lateral"
              aria-expanded="false"
              title="Abrir menu"
            >
              <Icon name="menu" size={21} />
            </button>
          )}
          {/* Celular: botão X para fechar (lg:hidden = some no desktop) */}
          <button onClick={onCloseMobile} className="grid size-11 place-items-center text-[var(--muted)] lg:hidden" aria-label="Fechar navegação"><Icon name="close" /></button>
        </div>
        {/* Desktop expandido: bolinha na borda do menu para recolhê-lo.
            "group" + "group-hover:" mostram a dica "Recolher menu" ao passar o mouse. */}
        <div className={`group absolute -right-4 top-8 z-10 ${collapsed ? "hidden" : "hidden lg:block"}`}>
          <button
            onClick={onCollapse}
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

        {/* ---------- Itens de navegação ---------- */}
        <nav className="mt-4 flex-1 px-4" aria-label="Navegação principal">
          <div className="space-y-1.5">
            {/* .map transforma cada item da lista em um <button>. "key" ajuda o
                React a identificar cada item entre renderizações. O item ativo
                ganha fundo verde claro. Recolhido, o texto some e fica só o ícone
                (o title mostra o nome ao passar o mouse). */}
            {navigation.map((item) => (
              <button key={item.label} title={collapsed ? item.label : undefined} onClick={() => onNavigate(item.label)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-[0.95rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${collapsed ? "lg:justify-center lg:gap-0 lg:px-0" : ""} ${active === item.label ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "text-[var(--muted-strong)] hover:bg-[var(--surface-soft)]"}`}>
                <Icon name={item.icon} size={18} className={active === item.label ? "text-[var(--brand)]" : "text-[var(--icon)]"} />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ---------- Rodapé: cartão com o total de registros de desperdício no mês ---------- */}
        <div className={`mx-4 mb-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)]/60 p-4 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--brand-dark)]"><span>Economia no Mês</span><Icon name="trend" size={16} /></div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{wasteThisMonth}</p>
          <p className="mt-1 text-xs text-[var(--brand)]">Registros de desperdício no mês</p>
        </div>
        {/* Suporte: hoje só mostra um Toast (não abre uma página real) */}
        <button onClick={onSupport} title="Suporte & Documentação" className={`mx-5 mb-5 flex min-h-11 items-center gap-3 text-sm text-[var(--muted-strong)] ${collapsed ? "lg:justify-center lg:gap-0" : ""}`}><Icon name="help" size={18} /> <span className={collapsed ? "lg:hidden" : ""}>Suporte & Documentação</span></button>
      </aside>
    </>
  );
}
