/** Barra de participação usada no relatório por motivo. */
export function Rank({ label, value, percent }: { label: string; value: string; percent: string }) {
  return <div><div className="flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><div className="mt-2 h-2 rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: percent }} /></div></div>;
}
