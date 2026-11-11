import type { ReactNode } from "react";
import { MiniIcon, type MiniIconName } from "./MiniIcon";

/** Botão principal preenchido com a cor da marca. */
export function PrimaryButton({ children, onClick, icon, type = "button" }: { children: ReactNode; onClick?: () => void; icon?: MiniIconName; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-dark)]">{icon && <MiniIcon name={icon} />}{children}</button>;
}
