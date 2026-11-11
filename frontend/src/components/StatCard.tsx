import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Cartão de indicador com variações visuais de atenção e perigo. */
export function StatCard({ label, value, suffix, icon, badge, footer, warning, danger }: { label: string; value: string; suffix: string; icon?: IconName; badge?: string; footer: ReactNode; warning?: boolean; danger?: boolean }) {
  return (
    <div className={`min-h-[158px] rounded-2xl border bg-white p-5 shadow-[var(--shadow)] ${warning ? "border-[var(--warning-border)]" : danger ? "border-[var(--danger-border)]" : "border-[var(--line)]"}`}>
      <div className="flex min-h-9 items-start justify-between gap-2"><p className="text-sm font-medium leading-snug text-[var(--muted-strong)]">{label}</p>{icon && <Icon name={icon} size={18} className="text-[var(--icon)]" />}{badge && <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${danger ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]" : "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-ink)]"}`}>{badge}</span>}</div>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${danger ? "text-[var(--danger)]" : warning ? "text-[var(--warning-strong)]" : ""}`}>{value} <span className="text-sm font-normal text-[var(--muted-strong)]">{suffix}</span></p>
      <p className={`mt-3 text-xs font-medium ${danger ? "text-[var(--danger)]" : "text-[var(--brand)]"}`}>{footer}</p>
    </div>
  );
}
