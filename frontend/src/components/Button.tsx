import type { ReactNode } from "react";
import { MiniIcon, type MiniIconName } from "./MiniIcon";

/**
 * Variantes de botão do sistema. Escolha pela intenção da ação, não pela cor:
 * - primary: confirmar, salvar, cadastrar, entrar, criar (verde da marca).
 * - secondary: cancelar, voltar, exportar e ações de apoio (contorno neutro).
 * - danger: excluir ou outra ação irreversível (vermelho preenchido).
 * - dangerSoft: registrar baixa/desperdício (vermelho suave, ação de perda).
 * - warning: chamadas dentro de avisos de validade (amarelo).
 * - ghost: ação discreta em linha de tabela ou link de navegação (texto verde).
 * - ghostDanger: ação discreta de perda/exclusão em linha de tabela (texto vermelho).
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "dangerSoft" | "warning" | "ghost" | "ghostDanger";

// Classes Tailwind comuns a todos os botões (formato, fonte, foco pelo teclado, estado desabilitado).
const BASE = "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

// Cores de cada variante. As cores vêm das variáveis CSS do index.css (var(--brand) etc.).
// Record<ButtonVariant, string> obriga a ter uma entrada para cada variante.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] focus-visible:outline-[var(--brand)]",
  secondary: "border border-[var(--line)] bg-white text-[var(--muted-strong)] hover:border-[var(--brand)] hover:text-[var(--brand-dark)] focus-visible:outline-[var(--brand)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[var(--danger-bright)] focus-visible:outline-[var(--danger)]",
  dangerSoft: "border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white focus-visible:outline-[var(--danger)]",
  warning: "bg-[var(--warning-button)] text-[var(--warning-ink)] hover:bg-[var(--warning-bright)] focus-visible:outline-[var(--warning)]",
  ghost: "text-[var(--brand-dark)] hover:bg-[var(--brand-soft)] focus-visible:outline-[var(--brand)]",
  ghostDanger: "text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:outline-[var(--danger)]",
};

// Tamanhos: md (padrão, altura 44px) e sm (tabelas e ações discretas).
const SIZES = {
  md: "min-h-11 px-5",
  sm: "min-h-10 px-3",
};

type ButtonProps = {
  children: ReactNode;          // texto do botão
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;    // keyof typeof SIZES = "md" | "sm"
  icon?: MiniIconName;          // ícone antes do texto
  /** Ícone ou elemento exibido depois do texto (ex.: chevron). */
  trailing?: ReactNode;
  // "submit" envia o <form> onde o botão está. O padrão é "button" para não
  // enviar formulários sem querer (no HTML, o padrão seria "submit").
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;           // usado para travar o botão enquanto salva
  fullWidth?: boolean;          // ocupa toda a largura
  className?: string;           // classes extras, ex.: margem "mt-5"
};

/**
 * Botão padrão do FoodTrack. Todas as ações da interface devem usar este componente.
 * Exemplo: <Button variant="secondary" icon="download" onClick={exportar}>Exportar</Button>
 * Os valores após "=" na desestruturação são os padrões quando a prop não é passada.
 */
export function Button({ children, variant = "primary", size = "md", icon, trailing, type = "button", onClick, disabled, fullWidth, className = "" }: ButtonProps) {
  return (
    // Junta as classes: base + cor da variante + tamanho + largura + extras.
    <button type={type} onClick={onClick} disabled={disabled} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}>
      {icon && <MiniIcon name={icon} />}
      {children}
      {trailing}
    </button>
  );
}
