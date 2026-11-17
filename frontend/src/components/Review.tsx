/**
 * Linha de conferência com rótulo e valor.
 * Usada no "Resumo do cadastro" da tela Cadastrar Alimento: rótulo cinza à
 * esquerda e o valor digitado em negrito à direita.
 */
export function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-3">
      <span className="text-[var(--muted)]">{label}</span>
      <strong className="max-w-[170px] text-right">{value}</strong>
    </div>
  );
}
