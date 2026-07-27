"use client";

/* Mocked data layer for the dashboard demo.
   Shapes mirror the real backend contract (jobs state machine, variations,
   token ledger) so the future FastAPI/Supabase wiring replaces this file's
   internals without touching the screens. */

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
  startJob: (file: File, meta: { duration: string }) => "ok" | "no-tokens";
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

const STORAGE_KEY = "admultiply-demo-v1";

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

export function DashboardProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<State>({
    userName: "Alex",
    email: "alex@company.com",
    plan: "free",
    tokens: 4,
    jobs: [],
    previewPlayed: false,
    anyDownloaded: false,
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // hydrate from localStorage (demo continuity)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as State;
        // objectURLs don't survive reloads; drop them + finish any mid-flight job
        saved.jobs = saved.jobs.map((j) => ({
          ...j,
          sourceUrl: null,
          stage: j.stage === "ready" || j.stage === "failed" ? j.stage : "ready",
          substatus: "",
          variations: j.variations.map((v) => ({ ...v, status: "ready" })),
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

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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

  const startJob = useCallback(
    (file: File, meta: { duration: string }): "ok" | "no-tokens" => {
      if (state.tokens <= 0) return "no-tokens";

      const id = `job_${Date.now().toString(36)}`;
      const category = CATEGORIES[state.jobs.length % CATEGORIES.length];
      const job: Job = {
        id,
        fileName: file.name,
        sourceUrl: URL.createObjectURL(file),
        sourcePoster: "",
        duration: meta.duration,
        category,
        stage: "queued",
        substatus: "Waiting for a worker…",
        createdAt: Date.now(),
        variations: STOCK.map((s, i) => ({
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

      // Reserve the token at submit (refunded on failure) — mirrors the backend.
      setState((s) => ({ ...s, tokens: s.tokens - 1, jobs: [job, ...s.jobs] }));

      // Simulated pipeline: queued → analyzing → planning → rendering ×3 → ready
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

      return "ok";
    },
    [state.tokens, state.jobs.length, patchJob, toast]
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
      setState((s) => ({
        ...s,
        anyDownloaded: true,
        jobs: s.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                variations: j.variations.map((v) =>
                  v.id === variationId ? { ...v, downloaded: true } : v
                ),
              }
            : j
        ),
      }));
      toast(kind === "hd" ? "HD download started" : "Watermarked preview download started");
    },
    [state.plan, toast]
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
    setState({
      userName: "Alex",
      email: "alex@company.com",
      plan: "free",
      tokens: 4,
      jobs: [],
      previewPlayed: false,
      anyDownloaded: false,
    });
    toast("Demo reset", "info");
  }, [toast]);

  return (
    <DashboardContext.Provider
      value={{
        ...state,
        hd: getPlan(state.plan).hd,
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
