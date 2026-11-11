import type { ReactNode } from "react";
import { MiniIcon, type MiniIconName } from "./MiniIcon";

/** Botão secundário com borda, usado em exportações e filtros. */
export function SecondaryButton({ children, onClick, icon, type = "button" }: { children: ReactNode; onClick?: () => void; icon?: MiniIconName; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-5 text-sm font-bold text-[var(--muted-strong)] hover:border-[var(--brand)] hover:text-[var(--brand-dark)]">{icon && <MiniIcon name={icon} />}{children}</button>;
}
