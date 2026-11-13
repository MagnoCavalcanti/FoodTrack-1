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

const BASE = "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] focus-visible:outline-[var(--brand)]",
  secondary: "border border-[var(--line)] bg-white text-[var(--muted-strong)] hover:border-[var(--brand)] hover:text-[var(--brand-dark)] focus-visible:outline-[var(--brand)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[var(--danger-bright)] focus-visible:outline-[var(--danger)]",
  dangerSoft: "border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white focus-visible:outline-[var(--danger)]",
  warning: "bg-[var(--warning-button)] text-[var(--warning-ink)] hover:bg-[var(--warning-bright)] focus-visible:outline-[var(--warning)]",
  ghost: "text-[var(--brand-dark)] hover:bg-[var(--brand-soft)] focus-visible:outline-[var(--brand)]",
  ghostDanger: "text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:outline-[var(--danger)]",
};

const SIZES = {
  md: "min-h-11 px-5",
  sm: "min-h-10 px-3",
};

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  icon?: MiniIconName;
  /** Ícone ou elemento exibido depois do texto (ex.: chevron). */
  trailing?: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
};

/** Botão padrão do FoodTrack. Todas as ações da interface devem usar este componente. */
export function Button({ children, variant = "primary", size = "md", icon, trailing, type = "button", onClick, disabled, fullWidth, className = "" }: ButtonProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}>
      {icon && <MiniIcon name={icon} />}
      {children}
      {trailing}
    </button>
  );
}
