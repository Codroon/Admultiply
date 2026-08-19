"use client";

/* The workhorse table.

   Sticky header, click-to-sort, pagination, keyboard-reachable rows, and a
   horizontal scroll container so wide tables never push the page sideways.
   Low-priority columns drop out below md rather than squashing. */

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  width?: string;
  hideOnMobile?: boolean;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  isRowActive,
  pageSize = 25,
  empty,
  initialSort,
  dense = false,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isRowActive?: (row: T) => boolean;
  pageSize?: number;
  empty?: ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const view = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  };

  if (!rows.length && empty) return <>{empty}</>;

  const cellPad = dense ? "px-3 py-2" : "px-3 py-2.5";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-surface-muted)] dark:bg-[var(--color-surface-dark-muted)]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={`border-b border-[var(--color-border-subtle)] ${cellPad} text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-muted)] dark:border-[var(--color-border-dark-subtle)] dark:text-[var(--color-ink-dark-muted)] ${
                    c.align === "right" ? "text-right" : ""
                  } ${c.hideOnMobile ? "hidden md:table-cell" : ""}`}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 transition-colors hover:text-[var(--color-ink)] dark:hover:text-white ${
                        c.align === "right" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === "asc" ? (
                          <ChevronUp size={11} strokeWidth={3} className="text-brand-500" />
                        ) : (
                          <ChevronDown size={11} strokeWidth={3} className="text-brand-500" />
                        )
                      ) : (
                        <ChevronDown size={11} strokeWidth={3} className="opacity-25" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row) => {
              const active = isRowActive?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`border-b border-[var(--color-border-subtle)] transition-colors last:border-0 dark:border-[var(--color-border-dark-subtle)] ${
                    onRowClick
                      ? "cursor-pointer outline-none hover:bg-black/[0.02] focus-visible:bg-brand-500/[0.06] dark:hover:bg-white/[0.03]"
                      : ""
                  } ${active ? "bg-brand-500/[0.07] dark:bg-brand-500/[0.09]" : ""}`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`${cellPad} align-middle text-[13px] ${
                        c.align === "right" ? "text-right tabular-nums" : ""
                      } ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${
                        active
                          ? "shadow-[inset_2px_0_0_0_var(--color-brand-500)] first:shadow-[inset_2px_0_0_0_var(--color-brand-500)]"
                          : ""
                      }`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] px-3 py-2.5 dark:border-[var(--color-border-dark-subtle)]">
          <span className="text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of{" "}
            {sorted.length.toLocaleString("en-US")}
          </span>
          <div className="flex items-center gap-1">
            <PagerButton
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              label="Previous page"
            >
              <ChevronLeft size={14} />
            </PagerButton>
            <span className="px-2 text-[11px] font-semibold tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <PagerButton
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              label="Next page"
            >
              <ChevronRight size={14} />
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-30 dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/10 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
