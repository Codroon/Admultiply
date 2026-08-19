"use client";

import { useMemo, useState } from "react";
import { Download, ListChecks, Search } from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  EmptyState,
  Meter,
  Panel,
  PanelHeader,
  StatTile,
} from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { WaitlistEntry } from "@/lib/admin-types";
import { NOW } from "@/lib/admin-mock";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/admin-stats";

export default function WaitlistPage() {
  const { waitlist } = useAdmin();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [onlySurveyed, setOnlySurveyed] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return waitlist.filter((w) => {
      if (onlySurveyed && !w.surveyed) return false;
      if (q && !`${w.email} ${w.company ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [waitlist, query, onlySurveyed]);

  const surveyed = waitlist.filter((w) => w.surveyed);
  const last7 = waitlist.filter((w) => w.createdAt >= NOW - 7 * 86_400_000).length;

  const breakdown = (key: "role" | "spend" | "channel") => {
    const counts = new Map<string, number>();
    for (const w of surveyed) {
      const v = w[key];
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  const exportCsv = () => {
    const header = ["email", "company", "role", "monthly_spend", "channel", "signed_up"];
    const rows = filtered.map((w) => [
      w.email,
      w.company ?? "",
      w.role ?? "",
      w.spend ?? "",
      w.channel ?? "",
      new Date(w.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `admultiply-waitlist-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} rows`);
  };

  const columns: Column<WaitlistEntry>[] = [
    {
      key: "email",
      header: "Email",
      sortValue: (w) => w.email,
      render: (w) => <span className="block truncate font-medium">{w.email}</span>,
    },
    {
      key: "company",
      header: "Company",
      hideOnMobile: true,
      sortValue: (w) => w.company ?? "",
      render: (w) => (
        <span className="block truncate text-[12px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {w.company ?? "—"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      hideOnMobile: true,
      sortValue: (w) => w.role ?? "",
      render: (w) => (w.role ? <Badge tone="neutral">{w.role}</Badge> : <Dash />),
    },
    {
      key: "spend",
      header: "Ad spend",
      hideOnMobile: true,
      sortValue: (w) => w.spend ?? "",
      render: (w) =>
        w.spend ? (
          <span className="text-[12px] tabular-nums">{w.spend}</span>
        ) : (
          <Dash />
        ),
    },
    {
      key: "channel",
      header: "Channel",
      hideOnMobile: true,
      sortValue: (w) => w.channel ?? "",
      render: (w) =>
        w.channel ? <span className="text-[12px]">{w.channel}</span> : <Dash />,
    },
    {
      key: "created",
      header: "Signed up",
      align: "right",
      sortValue: (w) => w.createdAt,
      render: (w) => (
        <span
          className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]"
          title={fmtDate(w.createdAt)}
        >
          {fmtAgo(w.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total signups" value={fmtNum(waitlist.length)} hint="Since launch of the page" />
        <StatTile label="Last 7 days" value={fmtNum(last7)} hint="New emails captured" />
        <StatTile
          label="Survey completed"
          value={`${((surveyed.length / waitlist.length) * 100).toFixed(0)}%`}
          hint={`${fmtNum(surveyed.length)} full profiles`}
        />
        <StatTile
          label="Qualified leads"
          value={fmtNum(
            surveyed.filter((w) => w.spend === "$5k–20k / mo" || w.spend === "$20k+ / mo").length
          )}
          hint="$5k+ monthly ad spend"
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(
          [
            ["role", "Who they are"],
            ["spend", "Monthly ad spend"],
            ["channel", "Primary channel"],
          ] as const
        ).map(([key, title]) => {
          const rows = breakdown(key);
          const max = rows[0]?.[1] ?? 1;
          return (
            <Panel key={key}>
              <PanelHeader title={title} subtitle={`${fmtNum(surveyed.length)} responses`} />
              <div className="flex flex-col gap-2.5 p-4">
                {rows.map(([label, count]) => (
                  <div key={label}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] font-medium">{label}</span>
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                        {count}
                        <span className="ml-1 font-normal text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                          {((count / surveyed.length) * 100).toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <Meter value={count} max={max} className="mt-1" />
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or company…"
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white py-2 pl-8 pr-3 text-base outline-none transition-colors focus:border-brand-500 dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)] sm:text-[12px]"
          />
        </div>
        <button
          onClick={() => setOnlySurveyed((s) => !s)}
          className={`rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors ${
            onlySurveyed
              ? "bg-brand-500/12 text-brand-600 ring-1 ring-brand-500/25 dark:text-brand-400"
              : "text-[var(--color-ink-muted)] hover:bg-black/[0.04] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/5"
          }`}
        >
          Completed survey only
        </button>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={exportCsv}>
          <Download size={13} />
          Export CSV
        </Button>
      </div>

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(w) => w.id}
          initialSort={{ key: "created", dir: "desc" }}
          empty={
            <EmptyState
              icon={<ListChecks size={20} />}
              title="No signups match"
              detail="Try clearing the search or the survey filter."
            />
          }
        />
      </Panel>

      <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        Live data source: the Supabase <code className="font-mono">waitlist</code> table,
        already collecting from the pre-launch homepage. This screen reads it directly —
        no new pipeline needed.
      </p>
    </div>
  );
}

function Dash() {
  return <span className="text-[var(--color-ink-muted)]">—</span>;
}
