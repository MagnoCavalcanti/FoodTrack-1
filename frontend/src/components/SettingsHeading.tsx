/** Título de uma seção da tela de configurações. */
export function SettingsHeading({ title, description, className = "" }: { title: string; description: string; className?: string }) {
  return <div className={className}><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--muted-strong)]">{description}</p></div>;
}
