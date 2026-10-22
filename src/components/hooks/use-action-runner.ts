"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string; needPin?: boolean };

type RunOptions = {
  /** True jika dipanggil dari dalam dialog: error ditampilkan di dialog, bukan toast (toast tertutup modal). */
  inDialog?: boolean;
  /** Dipanggil saat berhasil (mis. menutup dialog). */
  onSuccess?: () => void;
  /** Dipanggil saat sesi PIN habis (mis. menutup dialog agar tombol "Masukkan PIN lagi" terlihat). */
  onPinLost?: () => void;
};

const PIN_LOST = "Belum tersimpan. Sesi PIN mungkin habis, masukkan PIN lagi.";

/**
 * Pola standar menjalankan Server Action dari halaman kelola data:
 * transisi + toast + error di dialog + deteksi sesi PIN habis + refresh data server.
 */
export function useActionRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const run = (action: () => Promise<ActionResult>, opts: RunOptions = {}) =>
    startTransition(async () => {
      // null = permintaan dipotong proxy.ts (cookie PIN tidak valid) atau jaringan putus.
      const result = await action().catch(() => null);

      if (result === null || (!result.ok && result.needPin)) {
        setNeedPin(true);
        opts.onPinLost?.();
        setToast(result && !result.ok ? result.error : PIN_LOST);
        return;
      }
      if (!result.ok) {
        if (opts.inDialog) setDialogError(result.error);
        else setToast(result.error);
        return;
      }
      setNeedPin(false);
      setDialogError(null);
      setToast(result.message);
      opts.onSuccess?.();
      router.refresh();
    });

  return {
    run,
    pending,
    toast,
    clearToast: () => setToast(null),
    needPin,
    dialogError,
    clearDialogError: () => setDialogError(null),
  };
}
