"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Dialog konfirmasi bertema kaca (STYLEGUIDE §7).
 * Memakai <dialog> bawaan browser: fokus otomatis terkunci di dalam, Esc menutup,
 * dan konten di belakang tidak bisa diklik selama dialog terbuka.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Tombol aksi; susun dari yang utama ke yang paling ringan. */
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={onClose}
      // Klik di area gelap di luar kotak = batal.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="glass-bar m-auto w-[min(92vw,26rem)] rounded-hero p-0 text-ink backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5 sm:p-6">
        <h2 id="confirm-title" className="text-[19px] font-bold tracking-tight">
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-[15px] leading-relaxed text-ink-soft">{description}</div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5">{children}</div>
      </div>
    </dialog>
  );
}
