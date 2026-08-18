"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Minus,
  Plus,
  Search,
  UserCheck,
  Users as UsersIcon,
} from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Drawer } from "@/components/admin/drawer";
import {
  DetailRow,
  EmptyState,
  Meter,
  Panel,
  SectionTitle,
} from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, getPlan, type PlanId } from "@/lib/plans";
import { LEDGER_LABEL, type AdminUser } from "@/lib/admin-types";
import { CYCLE_START, DAYS_TO_RESET } from "@/lib/admin-mock";
import {
  balanceFor,
  fmtAgo,
  fmtCents,
  fmtDate,
  jobsFor,
  ledgerFor,
  userCost,
} from "@/lib/admin-stats";

export default function UsersPage() {
  return (
    <Suspense fallback={<Panel className="h-96 animate-pulse" />}>
      <UsersView />
    </Suspense>
  );
}

function UsersView() {
  const params = useSearchParams();
  const { users, jobs, ledger } = useAdmin();

  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<PlanId | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "suspended">(
    params.get("status") === "suspended" ? "suspended" : "all"
  );
  const [selectedId, setSelectedId] = useState<string | null>(params.get("user"));

  /* Precomputed once per data change. Calling balanceFor/jobsFor inside a cell
     renderer would scan the whole ledger per row — fine at 20 users, ~2.5M
     operations when sorting 600 of them against a few thousand jobs. */
  const balances = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of ledger) {
      if (e.createdAt < CYCLE_START) continue;
      m.set(e.userId, (m.get(e.userId) ?? 0) + e.delta);
    }
    return m;
  }, [ledger]);

  const jobCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs) m.set(j.userId, (m.get(j.userId) ?? 0) + 1);
    return m;
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (plan !== "all" && u.plan !== plan) return false;
      if (status !== "all" && u.status !== status) return false;
      if (q && !`${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, query, plan, status]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-bold uppercase text-white">
            {u.name.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{u.name}</span>
            <span className="block truncate text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
              {u.email}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      sortValue: (u) => getPlan(u.plan).price,
      render: (u) => (
        <Badge tone={u.plan === "free" ? "neutral" : "brand"}>{getPlan(u.plan).name}</Badge>
      ),
    },
    {
      key: "tokens",
      header: "Tokens",
      align: "right",
      sortValue: (u) => balances.get(u.id) ?? 0,
      hideOnMobile: true,
      render: (u) => {
        const bal = balances.get(u.id) ?? 0;
        const cap = getPlan(u.plan).tokens;
        return (
          <div className="ml-auto w-20">
            <span className="text-[12px] font-semibold tabular-nums">
              {bal} <span className="text-[var(--color-ink-muted)]">/ {cap}</span>
            </span>
            <Meter
              value={bal}
              max={cap}
              tone={bal === 0 ? "danger" : "brand"}
              className="mt-1"
            />
          </div>
        );
      },
    },
    {
      key: "jobs",
      header: "Videos",
      align: "right",
      hideOnMobile: true,
      sortValue: (u) => jobCounts.get(u.id) ?? 0,
      render: (u) => <span className="tabular-nums">{jobCounts.get(u.id) ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (u) => u.status,
      render: (u) =>
        u.status === "active" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Suspended
          </span>
        ),
    },
    {
      key: "lastActive",
      header: "Last active",
      align: "right",
      hideOnMobile: true,
      sortValue: (u) => u.lastActiveAt,
      render: (u) => (
        <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {fmtAgo(u.lastActiveAt)}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      align: "right",
      hideOnMobile: true,
      sortValue: (u) => u.createdAt,
      render: (u) => (
        <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {fmtDate(u.createdAt)}
        </span>
      ),
    },
  ];

  const selectCls =
    "rounded-lg border border-[var(--color-border-subtle)] bg-white px-2.5 py-2 text-[12px] font-medium focus:border-brand-500 focus:outline-none dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or user ID…"
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white py-2 pl-8 pr-3 text-base outline-none transition-colors focus:border-brand-500 dark:border-[var(--color-border-dark-subtle)] dark:bg-[var(--color-surface-dark-card)] sm:text-[12px]"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanId | "all")}
          className={selectCls}
        >
          <option value="all">All plans</option>
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className={selectCls}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <span className="ml-auto text-[11px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
          {filtered.length.toLocaleString("en-US")} of {users.length.toLocaleString("en-US")}
        </span>
      </div>

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(u) => u.id}
          onRowClick={(u) => setSelectedId(u.id)}
          isRowActive={(u) => u.id === selectedId}
          initialSort={{ key: "lastActive", dir: "desc" }}
          empty={
            <EmptyState
              icon={<UsersIcon size={20} />}
              title="No users match those filters"
              detail="Try clearing the search or widening the plan and status filters."
            />
          }
        />
      </Panel>

      {selected && (
        <UserDrawer user={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { jobs, ledger, adjustTokens, setSuspended } = useAdmin();
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const plan = getPlan(user.plan);
  const balance = balanceFor(ledger, user.id);
  const entries = ledgerFor(ledger, user.id).slice(0, 12);
  const myJobs = jobsFor(jobs, user.id);
  const ready = myJobs.filter((j) => j.stage === "ready");
  const failed = myJobs.filter((j) => j.stage === "failed");
  const downloads = ready.flatMap((j) => j.variations).filter((v) => v.downloadedAt).length;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={user.name}
        subtitle={user.email}
        footer={
          <div className="flex gap-2">
            <Button
              variant={user.status === "active" ? "danger" : "primary"}
              size="md"
              className="flex-1"
              onClick={() =>
                user.status === "active" ? setConfirmSuspend(true) : setSuspended(user.id, false)
              }
            >
              {user.status === "active" ? (
                <>
                  <Ban size={14} />
                  Suspend
                </>
              ) : (
                <>
                  <UserCheck size={14} />
                  Reactivate
                </>
              )}
            </Button>
            <Link href={`/admin/jobs?user=${user.id}`} className="flex-1">
              <Button variant="secondary" size="md" className="w-full">
                <Film size={14} />
                View jobs
              </Button>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={user.plan === "free" ? "neutral" : "brand"}>{plan.name} plan</Badge>
            <Badge tone={user.status === "active" ? "success" : "danger"}>
              {user.status === "active" ? "Active" : "Suspended"}
            </Badge>
            <Badge tone={user.sharePublicly ? "info" : "neutral"}>
              {user.sharePublicly ? <Eye size={10} /> : <EyeOff size={10} />}
              {user.sharePublicly ? "Showcase opt-in" : "Showcase opt-out"}
            </Badge>
          </div>

          {/* Balance */}
          <div>
            <SectionTitle hint={`Resets in ${DAYS_TO_RESET} days`}>Token balance</SectionTitle>
            <Panel className="p-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums">{balance}</span>
                <span className="text-xs text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                  of {plan.tokens} this cycle
                </span>
              </div>
              <Meter value={balance} max={plan.tokens} className="mt-2" />

              {/* Adjustment — writes a ledger row, never a mutated number */}
              <div className="mt-3.5 border-t border-[var(--color-border-subtle)] pt-3 dark:border-[var(--color-border-dark-subtle)]">
                <p className="text-[11px] font-bold">Adjust balance</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-[var(--color-border-subtle)] dark:border-[var(--color-border-dark-subtle)]">
                    <button
                      type="button"
                      onClick={() => setDelta((d) => d - 1)}
                      aria-label="Decrease"
                      className="flex h-8 w-8 items-center justify-center text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Minus size={13} />
                    </button>
                    <span
                      className={`w-11 text-center text-[13px] font-bold tabular-nums ${
                        delta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : delta < 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDelta((d) => d + 1)}
                      aria-label="Increase"
                      className="flex h-8 w-8 items-center justify-center text-[var(--color-ink-muted)] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason (recorded in the audit trail)"
                    className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-transparent px-2.5 py-2 text-base outline-none focus:border-brand-500 dark:border-[var(--color-border-dark-subtle)] sm:text-[12px]"
                  />
                </div>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  disabled={delta === 0}
                  onClick={() => {
                    adjustTokens(user.id, delta, note);
                    setNote("");
                    setDelta(1);
                  }}
                >
                  Apply adjustment
                </Button>
              </div>
            </Panel>
          </div>

          {/* Usage */}
          <div>
            <SectionTitle>Usage</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              <MiniStat label="Videos processed" value={String(ready.length)} />
              <MiniStat label="Variations generated" value={String(ready.length * 3)} />
              <MiniStat label="Variations downloaded" value={String(downloads)} />
              <MiniStat
                label="Failed jobs"
                value={String(failed.length)}
                tone={failed.length ? "danger" : "neutral"}
              />
            </div>
            <Panel className="mt-2.5 p-3">
              <DetailRow label="Lifetime AI cost">{fmtCents(userCost(jobs, user.id))}</DetailRow>
              <DetailRow label="Revenue / month">${plan.price}</DetailRow>
            </Panel>
          </div>

          {/* Audit trail — free, because the ledger IS the log */}
          <div>
            <SectionTitle hint="Append-only">Token ledger</SectionTitle>
            <Panel className="divide-y divide-[var(--color-border-subtle)] dark:divide-[var(--color-border-dark-subtle)]">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={`w-8 shrink-0 text-[13px] font-bold tabular-nums ${
                      e.delta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">
                      {LEDGER_LABEL[e.reason]}
                    </p>
                    {e.note && (
                      <p className="truncate text-[10px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                        {e.note}
                        {e.adminId && " · by admin"}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    {fmtAgo(e.createdAt)}
                  </span>
                </div>
              ))}
            </Panel>
          </div>

          {/* Account */}
          <div>
            <SectionTitle>Account</SectionTitle>
            <Panel className="p-3">
              <DetailRow label="User ID" mono>
                {user.id}
              </DetailRow>
              <DetailRow label="Joined">{fmtDate(user.createdAt)}</DetailRow>
              <DetailRow label="Last active">{fmtAgo(user.lastActiveAt)}</DetailRow>
              <DetailRow label="Showcase consent">
                {user.sharePublicly ? "Opted in" : "Opted out"}
              </DetailRow>
              {user.stripeCustomerId ? (
                <div className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="text-[11px] text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
                    Stripe customer
                  </span>
                  <a
                    href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {user.stripeCustomerId}
                    <ExternalLink size={10} />
                  </a>
                </div>
              ) : (
                <DetailRow label="Stripe customer">— no subscription</DetailRow>
              )}
            </Panel>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => setSuspended(user.id, true)}
        title={`Suspend ${user.name}?`}
        body="They lose access to the dashboard immediately and any running jobs are cancelled. Their data and token balance are preserved."
        confirmLabel="Suspend account"
        confirmWord="SUSPEND"
        danger
      />
    </>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <Panel className="p-3">
      <p
        className={`text-lg font-bold tabular-nums ${
          tone === "danger" && value !== "0" ? "text-red-600 dark:text-red-400" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
        {label}
      </p>
    </Panel>
  );
}

