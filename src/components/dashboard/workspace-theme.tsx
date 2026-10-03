"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/* The workspace is dark unless the user says otherwise.

   Not a style preference: this screen's job is to show footage, and footage
   only reads honestly against a neutral dark surround — it is why every
   editing tool from Premiere to CapCut is dark. A light-grey SaaS dashboard
   around a video player makes the video look washed out and the product look
   like a CRM.

   This is deliberately *scoped* rather than wired into the site-wide theme.
   The marketing pages are legitimately light-first, and flipping the global
   theme the first time someone opens the dashboard would change a page they
   never asked us to touch. The dark variant in this project is
   `&:where(.dark, .dark *)`, so putting the class on the shell's own root is
   enough to switch everything inside it.

   State lives in localStorage and is read through useSyncExternalStore rather
   than an effect: the server and the first client render both have to agree on
   "dark" or we get a flash, and reading external state in an effect means
   rendering the wrong thing first and correcting it. */

const KEY = "admultiply-workspace-mode";

export type WorkspaceMode = "dark" | "light";

const listeners = new Set<() => void>();

/* getSnapshot runs on every render, so the value is cached and only
   invalidated when we write it or another tab does. */
let cached: WorkspaceMode | null = null;

function readStored(): WorkspaceMode {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function getSnapshot(): WorkspaceMode {
  cached ??= readStored();
  return cached;
}

// Dark is what the server renders, and the default when nothing is stored, so
// the common path hydrates without a flash.
const getServerSnapshot = (): WorkspaceMode => "dark";

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: WorkspaceMode) {
  cached = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  listeners.forEach((l) => l());
}

type Ctx = { mode: WorkspaceMode; setMode: (m: WorkspaceMode) => void };

const WorkspaceThemeContext = createContext<Ctx | null>(null);

export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useCallback((m: WorkspaceMode) => write(m), []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <WorkspaceThemeContext.Provider value={value}>
      {children}
    </WorkspaceThemeContext.Provider>
  );
}

export function useWorkspaceTheme() {
  const ctx = useContext(WorkspaceThemeContext);
  if (!ctx) {
    throw new Error("useWorkspaceTheme must be used inside WorkspaceThemeProvider");
  }
  return ctx;
}

/* The element that actually carries the class. Everything in the dashboard —
   shell, modal, toasts — renders inside it, and nothing here uses a portal, so
   one wrapper covers the whole workspace.

   It also has to restate the base text and background colours. Globally those
   come from a `.dark body` rule, and `body` is an *ancestor* of this div, so
   scoping the class here means that rule no longer matches and every element
   that was relying on inheriting its colour would stay near-black on
   near-black. Setting them here gives the subtree its own root to inherit
   from. */
export function WorkspaceSurface({ children }: { children: ReactNode }) {
  const { mode } = useWorkspaceTheme();
  return (
    <div
      className={`${mode === "dark" ? "dark " : ""}bg-[var(--color-surface)] text-[var(--color-ink)] dark:bg-[var(--color-surface-dark)] dark:text-[var(--color-ink-dark)]`}
    >
      {children}
    </div>
  );
}
