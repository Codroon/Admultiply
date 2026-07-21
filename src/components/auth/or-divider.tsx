export function OrDivider({ label = "Or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--color-border-subtle)] dark:bg-[var(--color-border-dark-subtle)]" />
      <span className="text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--color-border-subtle)] dark:bg-[var(--color-border-dark-subtle)]" />
    </div>
  );
}
