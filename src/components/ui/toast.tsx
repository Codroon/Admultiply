"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, TriangleAlert } from "lucide-react";

type ToastTone = "success" | "info" | "error";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(
  () => {}
);

export const useToast = () => useContext(ToastContext);

const icons: Record<ToastTone, ReactNode> = {
  success: <Check size={14} strokeWidth={3} className="text-emerald-500" />,
  info: <Info size={14} className="text-brand-500" />,
  error: <TriangleAlert size={14} className="text-red-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-xl ring-1 ring-black/10 dark:bg-[var(--color-surface-dark-card)] dark:text-white dark:ring-white/10"
            >
              {icons[t.tone]}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
