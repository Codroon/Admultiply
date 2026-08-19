"use client";

/* Confirmation for anything an operator can't undo.

   `confirmWord` adds a typed check — used for suspension, where a misclick
   locks a paying customer out of the product. Ordinary confirmations skip it;
   asking people to type on every action just trains them to stop reading.

   The body is a separate component so it unmounts with the modal: the typed
   input resets on every open without an effect doing it by hand. */

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  confirmWord?: string;
  danger?: boolean;
};

export function ConfirmDialog(props: Props) {
  return (
    <Modal open={props.open} onClose={props.onClose}>
      <ConfirmBody {...props} />
    </Modal>
  );
}

function ConfirmBody({
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  confirmWord,
  danger = false,
}: Props) {
  const [typed, setTyped] = useState("");
  const ready = !confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase();

  return (
    <>
      <div className="flex gap-3.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-brand-500/10 text-brand-600 dark:text-brand-400"
          }`}
        >
          <TriangleAlert size={17} />
        </span>
        <div className="min-w-0 pr-6">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)] dark:text-[var(--color-ink-dark-muted)]">
            {body}
          </p>
        </div>
      </div>

      {confirmWord && (
        <label className="mt-4 block text-xs font-semibold">
          Type <span className="font-mono text-brand-600 dark:text-brand-400">{confirmWord}</span>{" "}
          to confirm
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            className="mt-1.5 w-full rounded-xl border border-[var(--color-border-subtle)] bg-transparent px-3.5 py-2.5 text-base font-normal transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[var(--color-border-dark-subtle)] sm:text-sm"
          />
        </label>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          size="md"
          disabled={!ready}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </>
  );
}
