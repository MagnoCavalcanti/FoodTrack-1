import type { ReactNode } from "react";

export type MiniIconName = "box" | "calendar" | "chart" | "check" | "download" | "filter" | "plus" | "printer" | "search" | "trash" | "users";

/** Ícone compacto usado em botões, cartões e estados vazios. */
export function MiniIcon({ name, size = 18 }: { name: MiniIconName; size?: number }) {
  const content: Record<MiniIconName, ReactNode> = {
    box: <><path d="m21 8-9 5-9-5 9-5z" /><path d="m3 8 9 5 9-5v9l-9 5-9-5zM12 13v9" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    chart: <><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></>,
    filter: <path d="M4 5h16M7 12h10M10 19h4" />,
    plus: <path d="M12 5v14M5 12h14" />,
    printer: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{content[name]}</svg>;
}
