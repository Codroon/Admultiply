"use client";

/* Data layer for the dashboard.

   Two modes, one contract. When NEXT_PUBLIC_PIPELINE_URL is set, uploads go to
   the FastAPI service in spike/api.py and clips come back as real files,
   revealed as each render lands. Without it, the provider simulates the
   pipeline so the deployed demo keeps working with no backend behind it.

   The screens don't know which mode they're in. That's the point: when the
   production backend (Celery, R2, Supabase) replaces the spike API, nothing
   above this file changes. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getPlan, type PlanId } from "@/lib/plans";
import { useToast } from "@/components/ui/toast";

export type Stage = "queued" | "analyzing" | "planning" | "rendering" | "ready" | "failed";

export type Variation = {
  id: string;
  label: string;
  strategy: string;
  blurb: string;
  src: string;
  poster: string;
  duration: string;
  status: "pending" | "rendering" | "ready";
  downloaded: boolean;
};

export type Job = {
  id: string;
  fileName: string;
  sourceUrl: string | null; // objectURL — lost on reload by design
  sourcePoster: string;
  duration: string;
  category: string;
  stage: Stage;
  substatus: string;
  createdAt: number;
  variations: Variation[];
};

export type JobOptions = {
  /** Burn our own captions. Paid plans only; off by default because most
      source ads already carry their own and stacking looks broken. */
  captions?: boolean;
};

type State = {
  userName: string;
  email: string;
  plan: PlanId;
  tokens: number;
  jobs: Job[];
  previewPlayed: boolean;
  anyDownloaded: boolean;
};

type Ctx = State & {
  hd: boolean;
  /** True when talking to a real pipeline rather than simulating one. */
  live: boolean;
  startJob: (file: File, meta: { duration: string }, opts?: JobOptions) => "ok" | "no-tokens";
  download: (jobId: string, variationId: string, kind: "hd" | "preview") => void;
  markPreviewPlayed: () => void;
  setPlan: (p: PlanId) => void;
  resetDemo: () => void;
  upgradeOpen: boolean;
  openUpgrade: () => void;
  closeUpgrade: () => void;
};

const DashboardContext = createContext<Ctx | null>(null);
export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard outside provider");
  return ctx;
};

/* Inlined at build time by Next.js. Empty string means simulate. */
const PIPELINE_URL = (process.env.NEXT_PUBLIC_PIPELINE_URL ?? "").replace(/\/$/, "");
const LIVE = PIPELINE_URL.length > 0;

const STORAGE_KEY = LIVE ? "admultiply-live-v1" : "admultiply-demo-v2";
const POLL_MS = 2000;

const INITIAL_STATE: State = {
  userName: "Alex",
  email: "alex@company.com",
  plan: "free",
  tokens: getPlan("free").tokens,
  jobs: [],
  previewPlayed: false,
  anyDownloaded: false,
};

/* ------------------------------------------------------------------------ */
/* Live mode: the API contract (mirrors spike/api.py)                       */
/* ------------------------------------------------------------------------ */

type ApiVariation = {
  id: string;
  strategy: string;
  title: string;
  logline: string;
  url: string;
  poster: string;
  duration_s: number;
  status: "ready";
};

type ApiJob = {
  id: string;
  stage: string;
  detail: string;
  file_name: string;
  error: string | null;
  category: string | null;
  product: string | null;
  planned: { strategy: string; title: string; logline: string }[];
  variations: ApiVariation[];
  warnings: string[];
};

/* The pipeline reports finer stages than the stepper shows. */
const STAGE_MAP: Record<string, Stage> = {
  queued: "queued",
  probing: "analyzing",
  analyzing: "analyzing",
  transcribing: "analyzing",
  understanding: "planning",
  planning: "planning",
  rendering: "rendering",
  ready: "ready",
  failed: "failed",
};

const CATEGORY_LABEL: Record<string, string> = {
  "talking-head": "Talking head",
  tutorial: "Tutorial",
  lifestyle: "Lifestyle",
  montage: "Montage",
  testimonial: "Testimonial",
  mixed: "Mixed",
};

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function placeholderVariations(jobId: string): Variation[] {
  return [0, 1, 2].map((i) => ({
    id: `${jobId}_v${i}`,
    label: `Variation ${i + 1}`,
    strategy: `Variation ${i + 1}`,
    blurb: "",
    src: "",
    poster: "",
    duration: "",
    status: "pending",
    downloaded: false,
  }));
}

/** Merge an API snapshot into the Job the screens hold. */
function fromApi(job: Job, api: ApiJob): Job {
  const stage = STAGE_MAP[api.stage] ?? job.stage;
  const done = api.variations ?? [];
  const planned = api.planned ?? [];
  const slots = Math.max(3, planned.length, done.length);

  const variations: Variation[] = Array.from({ length: slots }, (_, i) => {
    const prev = job.variations[i];
    const d = done[i];
    if (d) {
      return {
        id: d.id,
        label: d.title,
        strategy: d.strategy,
        blurb: d.logline,
        src: PIPELINE_URL + d.url,
        poster: d.poster ? PIPELINE_URL + d.poster : "",
        duration: fmtDuration(d.duration_s),
        status: "ready",
        downloaded: prev?.downloaded ?? false,
      };
    }
    const p = planned[i];
    return {
      id: prev?.id ?? `${job.id}_v${i}`,
      label: p?.title ?? prev?.label ?? `Variation ${i + 1}`,
      strategy: p?.strategy ?? prev?.strategy ?? `Variation ${i + 1}`,
      blurb: p?.logline ?? prev?.blurb ?? "",
      src: "",
      poster: "",
      duration: "",
      status: stage === "rendering" && i === done.length ? "rendering" : "pending",
      downloaded: false,
    };
  });

  return {
    ...job,
    stage,
    substatus: api.error ?? api.detail ?? "",
    category: api.category ? (CATEGORY_LABEL[api.category] ?? api.category) : job.category,
    variations,
  };
}

/* ------------------------------------------------------------------------ */
/* Demo mode: simulated pipeline                                             */
/* ------------------------------------------------------------------------ */

const STOCK = [
  {
    strategy: "Hook-first",
    blurb: "Opens on your strongest moment to stop the scroll in the first second.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=300&h=540&q=80",
    duration: "0:15",
  },
  {
    strategy: "Problem → Solution",
    blurb: "Frames the pain point, then lands your product as the answer.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    poster: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&h=540&q=80",
    duration: "0:15",
  },
  {
    strategy: "Social proof",
    blurb: "Leads with credibility and outcomes to convert warm audiences.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    poster: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&h=540&q=80",
    duration: "0:15",
  },
];

const CATEGORIES = ["E-commerce", "Fitness", "SaaS", "Beauty", "Food & Drink"];

const ANALYZE_LINES = [
  "Indexing scenes…",
  "Found 6 key scenes",
  "Transcribing audio…",
  "Transcript complete — 214 words",
];
const PLAN_LINES = [
  "Studying your winning formula…",
  "Hook-first angle drafted",
  "Problem → Solution angle drafted",
  "Social-proof angle drafted",
];

/* ------------------------------------------------------------------------ */

export function DashboardProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as State;
        saved.jobs = saved.jobs.map((j) => ({
          ...j,
          sourceUrl: null, // objectURLs don't survive reloads
          // In demo mode a reload finishes any mid-flight job; in live mode
          // we resume polling instead, below.
          stage: LIVE || j.stage === "ready" || j.stage === "failed" ? j.stage : "ready",
          substatus: LIVE ? j.substatus : "",
          variations: LIVE
            ? j.variations
            : j.variations.map((v) => ({ ...v, status: "ready" })),
        }));
        setState(saved);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      pollers.current.forEach(clearInterval);
    },
    []
  );

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const patchJob = useCallback((id: string, patch: Partial<Job> | ((j: Job) => Partial<Job>)) => {
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((j) =>
        j.id === id ? { ...j, ...(typeof patch === "function" ? patch(j) : patch) } : j
      ),
    }));
  }, []);

  /* ---------------------------------------------------------------- live */

  const stopPolling = useCallback((jobId: string) => {
    const t = pollers.current.get(jobId);
    if (t) clearInterval(t);
    pollers.current.delete(jobId);
  }, []);

  const poll = useCallback(
    (jobId: string) => {
      if (pollers.current.has(jobId)) return;
      const tick = async () => {
        try {
          const res = await fetch(`${PIPELINE_URL}/jobs/${jobId}`);
          if (res.status === 404) {
            stopPolling(jobId);
            patchJob(jobId, { stage: "failed", substatus: "This job is no longer on the server." });
            return;
          }
          if (!res.ok) return;
          const api = (await res.json()) as ApiJob;
          setState((s) => ({
            ...s,
            jobs: s.jobs.map((j) => (j.id === jobId ? fromApi(j, api) : j)),
          }));
          if (api.stage === "ready") {
            stopPolling(jobId);
            toast("Your 3 variations are ready 🎉");
            if (api.warnings?.length) console.info("[pipeline]", api.warnings);
          } else if (api.stage === "failed") {
            stopPolling(jobId);
            // Token reserved at submit comes back on failure — mirrors the ledger.
            setState((s) => ({ ...s, tokens: s.tokens + 1 }));
            toast(api.error ?? "Processing failed", "error");
          }
        } catch {
          /* network blip — try again next tick */
        }
      };
      tick();
      pollers.current.set(jobId, setInterval(tick, POLL_MS));
    },
    [patchJob, stopPolling, toast]
  );

  // Resume polling any job that was mid-flight when the page loaded.
  useEffect(() => {
    if (!hydrated || !LIVE) return;
    state.jobs
      .filter((j) => j.stage !== "ready" && j.stage !== "failed")
      .forEach((j) => poll(j.id));
    // Only on hydrate; later jobs start their own polling in startJob.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const startLive = useCallback(
    (job: Job, file: File, opts: JobOptions) => {
      const body = new FormData();
      body.append("file", file, file.name);
      body.append("id", job.id);
      body.append("captions", String(Boolean(opts.captions)));
      // Free renders watermarked; paid renders clean. Decided once, at submit,
      // the same way HD downloads are gated.
      body.append("watermark", String(!getPlan(state.plan).hd));

      fetch(`${PIPELINE_URL}/jobs`, { method: "POST", body })
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);
          poll(job.id);
        })
        .catch((e: Error) => {
          patchJob(job.id, { stage: "failed", substatus: e.message });
          setState((s) => ({ ...s, tokens: s.tokens + 1 }));
          toast(
            e.message.includes("Failed to fetch")
              ? "Can't reach the pipeline — is the API running on port 8000?"
              : e.message,
            "error"
          );
        });
    },
    [state.plan, poll, patchJob, toast]
  );

  /* ---------------------------------------------------------------- demo */

  const startDemo = useCallback(
    (id: string) => {
      let t = 1400;
      later(t, () => patchJob(id, { stage: "analyzing", substatus: ANALYZE_LINES[0] }));
      ANALYZE_LINES.slice(1).forEach((line) => {
        t += 1400;
        later(t, () => patchJob(id, { substatus: line }));
      });
      t += 1400;
      later(t, () => patchJob(id, { stage: "planning", substatus: PLAN_LINES[0] }));
      PLAN_LINES.slice(1).forEach((line) => {
        t += 1100;
        later(t, () => patchJob(id, { substatus: line }));
      });
      for (let i = 0; i < 3; i++) {
        t += i === 0 ? 1100 : 2400;
        const idx = i;
        later(t, () =>
          patchJob(id, (j) => ({
            stage: "rendering",
            substatus: `Rendering variation ${idx + 1} of 3…`,
            variations: j.variations.map((v, vi) =>
              vi === idx ? { ...v, status: "rendering" } : v
            ),
          }))
        );
        later(t + 2200, () =>
          patchJob(id, (j) => ({
            variations: j.variations.map((v, vi) =>
              vi === idx ? { ...v, status: "ready" } : v
            ),
          }))
        );
      }
      t += 2600;
      later(t, () => {
        patchJob(id, { stage: "ready", substatus: "" });
        toast("Your 3 variations are ready 🎉");
      });
    },
    [patchJob, toast]
  );

  /* ---------------------------------------------------------------- api */

  const startJob = useCallback(
    (file: File, meta: { duration: string }, opts: JobOptions = {}): "ok" | "no-tokens" => {
      if (state.tokens <= 0) return "no-tokens";

      const id = `job_${Date.now().toString(36)}`;
      const job: Job = {
        id,
        fileName: file.name,
        sourceUrl: URL.createObjectURL(file),
        sourcePoster: "",
        duration: meta.duration,
        category: LIVE ? "Analysing…" : CATEGORIES[state.jobs.length % CATEGORIES.length],
        stage: "queued",
        substatus: "Waiting for a worker…",
        createdAt: Date.now(),
        variations: LIVE
          ? placeholderVariations(id)
          : STOCK.map((s, i) => ({
              id: `${id}_v${i}`,
              label: `Hook ${String.fromCharCode(65 + i)}`,
              strategy: s.strategy,
              blurb: s.blurb,
              src: s.src,
              poster: s.poster,
              duration: s.duration,
              status: "pending",
              downloaded: false,
            })),
      };

      // Reserve the token at submit (refunded on failure) — mirrors the ledger.
      setState((s) => ({ ...s, tokens: s.tokens - 1, jobs: [job, ...s.jobs] }));

      if (LIVE) startLive(job, file, opts);
      else startDemo(id);
      return "ok";
    },
    [state.tokens, state.jobs.length, startLive, startDemo]
  );

  const download = useCallback(
    (jobId: string, variationId: string, kind: "hd" | "preview") => {
      const plan = getPlan(state.plan);
      if (kind === "hd" && !plan.hd) {
        setUpgradeOpen(true);
        return;
      }
      // The flywheel vote — in production this hits the events table + PostHog.
      console.info("[event] variation_downloaded", { jobId, variationId, kind, plan: state.plan });

      const v = state.jobs.find((j) => j.id === jobId)?.variations.find((x) => x.id === variationId);
      if (LIVE && v?.src) {
        // Cross-origin, so the download attribute alone won't force a save;
        // pull it as a blob and hand the browser a same-origin object URL.
        fetch(v.src)
          .then((r) => r.blob())
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${v.strategy.replace(/[^\w]+/g, "-").toLowerCase()}.mp4`;
            a.click();
            URL.revokeObjectURL(url);
          })
          .catch(() => toast("Download failed — try again", "error"));
      }

      setState((s) => ({
        ...s,
        anyDownloaded: true,
        jobs: s.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                variations: j.variations.map((x) =>
                  x.id === variationId ? { ...x, downloaded: true } : x
                ),
              }
            : j
        ),
      }));
      toast(kind === "hd" ? "HD download started" : "Watermarked preview download started");
    },
    [state.plan, state.jobs, toast]
  );

  const markPreviewPlayed = useCallback(
    () => setState((s) => (s.previewPlayed ? s : { ...s, previewPlayed: true })),
    []
  );

  const setPlan = useCallback(
    (p: PlanId) => {
      setState((s) => ({ ...s, plan: p, tokens: Math.max(s.tokens, getPlan(p).tokens) }));
      toast(`Plan switched to ${getPlan(p).name} (demo)`, "info");
    },
    [toast]
  );

  const resetDemo = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    pollers.current.forEach(clearInterval);
    pollers.current.clear();
    setState(INITIAL_STATE);
    toast("Demo reset", "info");
  }, [toast]);

  return (
    <DashboardContext.Provider
      value={{
        ...state,
        hd: getPlan(state.plan).hd,
        live: LIVE,
        startJob,
        download,
        markPreviewPlayed,
        setPlan,
        resetDemo,
        upgradeOpen,
        openUpgrade: () => setUpgradeOpen(true),
        closeUpgrade: () => setUpgradeOpen(false),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
