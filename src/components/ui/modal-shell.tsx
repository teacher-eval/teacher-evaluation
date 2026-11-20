"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { CloseIcon } from "@/components/icons";

/**
 * Dialog frame shared by the admin screens.
 *
 * Ported from the PHP modal markup: a navy header with a close button, a
 * scrollable body and a footer supplied by the caller. Escape closes it and
 * the page behind is locked while it is open.
 */
export function ModalShell({
  title,
  subtitle,
  size = "lg",
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  /** `md` mirrors the narrower course dialogs (max-w-md). */
  size?: "md" | "lg" | "xl";
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panel.current
      ?.querySelector<HTMLElement>("input:not([type='file']), select, textarea, button")
      ?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={`modal-panel animate-modal-in ${
          size === "md" ? "max-w-md" : size === "xl" ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-100 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
