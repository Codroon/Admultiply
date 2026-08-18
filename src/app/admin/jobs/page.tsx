"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Coins,
  Download,
  Film,
  Loader2,
  RotateCcw,
  Search,
  User as UserIcon,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Drawer } from "@/components/admin/drawer";
import {
  DetailRow,
  EmptyState,
  Panel,
  SectionTitle,
} from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ERROR_LABEL,
  ERROR_RETRYABLE,
  PROVIDER_LABEL,
  STAGE_LABEL,
  type AdminJob,
} from "@/lib/admin-types";
import {
  fmtAgo,
  fmtCents,
  fmtDuration,
  fmtElapsed,
} from "@/lib/admin-stats";

type Filter = "all" | "failed" | "unrefunded" | "inflight" | "ready";

export default function JobsPage() {
  return (
    <Suspense fallback={<Panel className="h-96 animate-pulse" />}>
      <JobsView />
    </Suspense>
  );
}

function JobsView() {
  const params = useSearchParams();
  const { jobs, users } = useAdmin();

  const urlFilter = params.get("filter");
  const [filter, setFilter] = useState<Filter>(
    urlFilter === "failed" || urlFilter === "unrefunded" ? urlFilter : "all"
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("job"));
  const userFilter = params.get("user");

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (userFilter && j.userId !== userFilter) return false;
      if (filter === "failed" && j.stage !== "failed") return false;
      if (filter === "unrefunded" && !(j.stage === "failed" && !j.tokenRefunded)) return false;
      if (filter === "ready" && j.stage !== "ready") return false;
      if (filter === "inflight" && (j.stage === "ready" || j.stage === "failed")) return false;
      if (q) {
        const user = userById.get(j.userId);
        if (
          !`${j.id} ${j.fileName} ${user?.email ?? ""} ${user?.name ?? ""}`
            .toLowerCase()
            .includes(q)
        )
          return false;
      }
      return true;
    });
  }, [jobs, filter, query, userFilter, userById]);

  const selected = jobs.find((j) => j.id === selectedId) ?? null;
  const counts = useMemo(
    () => ({
      all: jobs.length,
      failed: jobs.filter((j) => j.stage === "failed").length,
      unrefunded: jobs.filter((j) => j.stage === "failed" && !j.tokenRefunded).length,
      inflight: jobs.filter((j) => j.stage !== "ready" && j.stage !== "failed").length,
      ready: jobs.filter((j) => j.stage === "ready").length,
    }),
    [jobs]
  );

  const columns: Column<AdminJob>[] = [
    {
      key: "id",
      header: "Job",
      sortValue: (j) => j.id,
      render: (j) => (
        <div className="min-w-0">
          <span className="block truncate font-mono text-[11px] font-semibold">{j.id}</span>
          <span className="block truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {j.fileName}
          </span>
        </div>
      ),
    },
    {
      key: "user",
      header: "Customer",
      hideOnMobile: true,
      sortValue: (j) => userById.get(j.userId)?.email ?? "",
      render: (j) => {
        const u = userById.get(j.userId);
        return (
          <span className="block truncate text-[12px]">
            {u?.email ?? j.userId}
          </span>
        );
      },
    },
    {
      key: "stage",
      header: "Status",
      sortValue: (j) => j.stage,
      render: (j) => <StageBadge job={j} />,
    },
    {
      key: "duration",
      header: "Source",
      align: "right",
      hideOnMobile: true,
      sortValue: (j) => j.durationS,
      render: (j) => (
        <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {fmtDuration(j.durationS)} · {j.sizeMb} MB
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      sortValue: (j) => j.costCents,
      render: (j) => <span className="text-[12px] tabular-nums">{fmtCents(j.costCents)}</span>,
    },
    {
      key: "created",
      header: "Submitted",
      align: "right",
      hideOnMobile: true,
      sortValue: (j) => j.createdAt,
      render: (j) => (
        <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {fmtAgo(j.createdAt)}
        </span>
      ),
    },
  ];

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "inflight", label: "In flight", count: counts.inflight },
    { id: "failed", label: "Failed", count: counts.failed },
    { id: "unrefunded", label: "Token held", count: counts.unrefunded },
    { id: "ready", label: "Delivered", count: counts.ready },
  ];

  return (
    <div className="flex flex-col gap-4">
      {userFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-500/[0.07] px-3 py-2 text-[12px] ring-1 ring-brand-500/20">
          <UserIcon size={13} className="text-brand-500" />
          Showing jobs for{" "}
          <span className="font-semibold">
            {userById.get(userFilter)?.email ?? userFilter}
          </span>
          <Link
            href="/admin/jobs"
            className="ml-auto font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            Clear
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                filter === f.id
                  ? "bg-brand-500/12 text-brand-600 ring-1 ring-brand-500/25 dark:text-brand-400"
                  : "text-[var(--color-ink-muted)] hover:bg-black/[0.04] dark:text-[var(--color-ink-dark-muted)] dark:hover:bg-white/5"
              }`}
            >
              {f.label}
              <span
                className={`rounded px-1 text-[10px] tabular-nums ${
                  f.id === "unrefunded" && f.count > 0
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : "bg-black/[0.06] dark:bg-white/10"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Job ID, filename or customer…"
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white py-2 pl-8 pr-3 text-base outline-none transition-colors focus:border-brand-500 dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)] sm:text-[12px]"
          />
        </div>
      </div>

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(j) => j.id}
          onRowClick={(j) => setSelectedId(j.id)}
          isRowActive={(j) => j.id === selectedId}
          initialSort={{ key: "created", dir: "desc" }}
          empty={
            <EmptyState
              icon={<Film size={20} />}
              title="No jobs match"
              detail="Nothing in this filter right now — which, for failures, is the good outcome."
            />
          }
        />
      </Panel>

      {selected && <JobDrawer job={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StageBadge({ job }: { job: AdminJob }) {
  if (job.stage === "ready")
    return (
      <Badge tone="success">
        <CheckCircle2 size={10} />
        Delivered
      </Badge>
    );
  if (job.stage === "failed")
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="danger">
          <CircleAlert size={10} />
          {job.errorCode ? ERROR_LABEL[job.errorCode] : "Failed"}
        </Badge>
        {!job.tokenRefunded && (
          <Badge tone="warning">
            <Coins size={10} />
            Token held
          </Badge>
        )}
      </div>
    );
  return (
    <Badge tone="info">
      <Loader2 size={10} className="animate-spin" />
      {STAGE_LABEL[job.stage]}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */

function JobDrawer({ job, onClose }: { job: AdminJob; onClose: () => void }) {
  const { users, retryJob, refundToken } = useAdmin();
  const user = users.find((u) => u.id === job.userId);
  const kept = job.variations.filter((v) => v.downloadedAt).length;
  const retryable = job.errorCode ? ERROR_RETRYABLE[job.errorCode] : false;

  return (
    <Drawer
      open
      onClose={onClose}
      title={<span className="font-mono">{job.id}</span>}
      subtitle={job.fileName}
      footer={
        <div className="flex flex-wrap gap-2">
          {job.stage === "failed" && (
            <>
              <Button
                size="md"
                className="flex-1"
                disabled={!retryable}
                onClick={() => retryJob(job.id)}
              >
                <RotateCcw size={14} />
                {retryable ? "Retry job" : "Not retryable"}
              </Button>
              {!job.tokenRefunded && (
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => refundToken(job.id)}
                >
                  <Coins size={14} />
                  Refund token
                </Button>
              )}
            </>
          )}
          {job.stage !== "failed" && user && (
            <Link href={`/admin/users?user=${user.id}`} className="flex-1">
              <Button variant="secondary" size="md" className="w-full">
                <UserIcon size={14} />
                Open customer
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge job={job} />
          {job.retryCount > 0 && (
            <Badge tone="neutral">
              Retried {job.retryCount}×
            </Badge>
          )}
          <Badge tone="neutral">{job.category}</Badge>
        </div>

        {/* Error first — it's why you opened this */}
        {job.stage === "failed" && job.errorCode && (
          <div className="rounded-xl bg-red-500/[0.06] p-3.5 ring-1 ring-red-500/20">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-red-600 dark:text-red-400">
              <CircleAlert size={13} />
              {ERROR_LABEL[job.errorCode]}
            </p>
            <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              {job.errorMessage}
            </p>
            <p className="mt-2 text-[11px] font-semibold">
              {job.tokenRefunded ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Token returned to the customer
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  Token still held — the customer paid for nothing
                </span>
              )}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <SectionTitle hint={totalElapsed(job)}>Pipeline</SectionTitle>
          <Panel className="p-3.5">
            <ol className="flex flex-col gap-0">
              {job.stages.map((s, i) => (
                <li key={s.stage} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        s.status === "done"
                          ? "bg-emerald-500 text-white"
                          : s.status === "failed"
                            ? "bg-red-500 text-white"
                            : s.status === "running"
                              ? "bg-brand-500 text-white"
                              : "bg-black/[0.08] text-[var(--color-ink-muted)] dark:bg-white/10"
                      }`}
                    >
                      {s.status === "done" ? (
                        <CheckCircle2 size={11} strokeWidth={3} />
                      ) : s.status === "failed" ? (
                        <CircleAlert size={11} strokeWidth={3} />
                      ) : s.status === "running" ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <CircleDashed size={11} />
                      )}
                    </span>
                    {i < job.stages.length - 1 && (
                      <span
                        className={`w-px flex-1 ${
                          s.status === "done"
                            ? "bg-emerald-500/40"
                            : "bg-black/10 dark:bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-3 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-semibold">
                        {STAGE_LABEL[s.stage]}
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                        {s.status === "pending" ? "—" : fmtElapsed(s.durationMs)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        {/* Output */}
        {job.stage === "ready" && (
          <div>
            <SectionTitle hint={`${kept} of 3 kept`}>Variations</SectionTitle>
            <Panel className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
              {job.variations.map((v) => (
                <div key={v.slot} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-[11px] font-bold dark:bg-white/10">
                    {v.slot}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{v.strategy}</p>
                    <p className="text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                      {v.downloadedAt
                        ? `Downloaded ${fmtAgo(v.downloadedAt)}${
                            v.downloadCount > 1 ? ` · ${v.downloadCount}×` : ""
                          }`
                        : "Not downloaded"}
                    </p>
                  </div>
                  {v.downloadedAt ? (
                    <Badge tone="success">
                      <Download size={10} />
                      Kept
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Passed over</Badge>
                  )}
                </div>
              ))}
            </Panel>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              Which variation the customer keeps is the training signal behind the
              strategy win-rates on AI Usage.
            </p>
          </div>
        )}

        {/* Cost */}
        <div>
          <SectionTitle hint={fmtCents(job.costCents)}>Cost breakdown</SectionTitle>
          <Panel className="p-3">
            {job.apiUsage.map((u) => (
              <DetailRow key={u.provider} label={PROVIDER_LABEL[u.provider]}>
                <span className="font-normal text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  {u.units} {u.unitLabel} ·{" "}
                </span>
                {fmtCents(u.costCents)}
              </DetailRow>
            ))}
          </Panel>
        </div>

        {/* Meta */}
        <div>
          <SectionTitle>Details</SectionTitle>
          <Panel className="p-3">
            {user && (
              <div className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  Customer
                </span>
                <Link
                  href={`/admin/users?user=${user.id}`}
                  className="truncate text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  {user.email}
                </Link>
              </div>
            )}
            <DetailRow label="Source">
              {fmtDuration(job.durationS)} · {job.sizeMb} MB
            </DetailRow>
            <DetailRow label="Submitted">{fmtAgo(job.createdAt)}</DetailRow>
            {job.finishedAt && (
              <DetailRow label="Finished">{fmtAgo(job.finishedAt)}</DetailRow>
            )}
          </Panel>
        </div>
      </div>
    </Drawer>
  );
}

function totalElapsed(job: AdminJob) {
  const ms = job.stages.reduce(
    (s, x) => s + (x.status === "pending" ? 0 : x.durationMs),
    0
  );
  return fmtElapsed(ms);
}
