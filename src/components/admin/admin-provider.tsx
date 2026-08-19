"use client";

/* Mocked data layer for the admin demo.

   Mirrors the real backend contract in src/lib/admin-types.ts, so wiring
   FastAPI later replaces this file's internals without touching a screen.
   Every mutating action here corresponds to an audited API call. */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/components/ui/toast";
import { ADMIN, JOBS, LEDGER, NOW, QUEUE, SERVICES, USERS, WAITLIST } from "@/lib/admin-mock";
import type {
  AdminJob,
  AdminUser,
  LedgerEntry,
  ServiceHealth,
} from "@/lib/admin-types";

type Ctx = {
  admin: typeof ADMIN;
  users: AdminUser[];
  jobs: AdminJob[];
  ledger: LedgerEntry[];
  waitlist: typeof WAITLIST;
  services: ServiceHealth[];
  queue: typeof QUEUE;
  now: number;

  adjustTokens: (userId: string, delta: number, note: string) => void;
  setSuspended: (userId: string, suspended: boolean) => void;
  retryJob: (jobId: string) => void;
  refundToken: (jobId: string) => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
};

const AdminContext = createContext<Ctx | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin outside provider");
  return ctx;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>(USERS);
  const [jobs, setJobs] = useState<AdminJob[]>(JOBS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(LEDGER);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ledgerSeq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Every adjustment is a ledger row, never a mutated balance. The audit
     trail is a consequence of the data model, not a separate feature. */
  const adjustTokens = useCallback(
    (userId: string, delta: number, note: string) => {
      if (!delta) return;
      setLedger((l) => [
        {
          id: `led_adj_${ledgerSeq.current++}`,
          userId,
          delta,
          reason: "admin_adjust",
          jobId: null,
          adminId: ADMIN.id,
          note: note || "Manual adjustment",
          createdAt: NOW,
        },
        ...l,
      ]);
      toast(
        `${delta > 0 ? "Granted" : "Removed"} ${Math.abs(delta)} token${
          Math.abs(delta) === 1 ? "" : "s"
        }`
      );
    },
    [toast]
  );

  const setSuspended = useCallback(
    (userId: string, suspended: boolean) => {
      setUsers((us) =>
        us.map((u) =>
          u.id === userId ? { ...u, status: suspended ? "suspended" : "active" } : u
        )
      );
      toast(suspended ? "Account suspended" : "Account reactivated", suspended ? "error" : "success");
    },
    [toast]
  );

  /* Retry re-runs the pipeline at our cost — the customer's token was already
     returned when the job failed, so we don't charge them twice. */
  const retryJob = useCallback(
    (jobId: string) => {
      setJobs((js) =>
        js.map((j) =>
          j.id === jobId
            ? {
                ...j,
                stage: "queued",
                errorCode: null,
                errorMessage: null,
                retryCount: j.retryCount + 1,
                finishedAt: null,
                stages: j.stages.map((s, i) => ({
                  ...s,
                  status: i === 0 ? "running" : "pending",
                })),
              }
            : j
        )
      );
      toast("Job requeued — worker will pick it up shortly", "info");

      timers.current.push(
        setTimeout(() => {
          setJobs((js) =>
            js.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    stage: "ready",
                    finishedAt: NOW,
                    stages: j.stages.map((s) => ({ ...s, status: "done" })),
                    variations: j.variations.map((v) => ({ ...v, status: "ready" })),
                  }
                : j
            )
          );
          toast("Retry succeeded — 3 variations delivered");
        }, 2600)
      );
    },
    [toast]
  );

  const refundToken = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job || job.tokenRefunded) return;

      setJobs((js) => js.map((j) => (j.id === jobId ? { ...j, tokenRefunded: true } : j)));
      setLedger((l) => [
        {
          id: `led_ref_${ledgerSeq.current++}`,
          userId: job.userId,
          delta: 1,
          reason: "job_refund",
          jobId,
          adminId: ADMIN.id,
          note: "Manual refund by admin",
          createdAt: NOW,
        },
        ...l,
      ]);
      toast("Token returned to the customer");
    },
    [jobs, toast]
  );

  const value = useMemo<Ctx>(
    () => ({
      admin: ADMIN,
      users,
      jobs,
      ledger,
      waitlist: WAITLIST,
      services: SERVICES,
      queue: QUEUE,
      now: NOW,
      adjustTokens,
      setSuspended,
      retryJob,
      refundToken,
      paletteOpen,
      setPaletteOpen,
    }),
    [users, jobs, ledger, adjustTokens, setSuspended, retryJob, refundToken, paletteOpen]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
