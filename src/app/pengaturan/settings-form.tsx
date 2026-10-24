"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveSettings } from "@/actions/settings";
import { useActionRunner } from "@/components/hooks/use-action-runner";
import { useLeaveGuard } from "@/components/hooks/use-leave-guard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Settings = { bufferPct: number };

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const { run, pending, toast, clearToast, needPin } = useActionRunner();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = values.bufferPct !== saved.bufferPct;
  const { pendingHref, clearPending } = useLeaveGuard(dirty);

  const save = (after?: () => void) =>
    run(() => saveSettings(values), {
      onSuccess: () => {
        setSaved(values);
        after?.();
      },
      onPinLost: clearPending,
    });

  // Navigasi client-side (bukan reload penuh) supaya dialog bawaan browser tidak ikut muncul.
  const leave = (href: string) => {
    clearPending();
    router.push(href);
  };

  const row = "grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3";

  return (
    <section aria-labelledby="settings-title">
      <h2 id="settings-title" className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">
        Setelan perhitungan
      </h2>
      <div className="glass rounded-panel">
        <div className={row}>
          <span className="min-w-0">
            <span className="block text-[16px] font-medium">Cadangan stok</span>
            <span className="block text-[13px] text-ink-soft">Tambahan di atas prediksi</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Stepper
              label="Cadangan stok (persen)"
              value={values.bufferPct}
              onChange={(v) => setValues((s) => ({ ...s, bufferPct: v }))}
              min={0}
              max={100}
            />
            <span className="text-[15px] text-ink-soft">%</span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p
          className={cn(
            "flex items-center gap-2 text-[14px]",
            dirty ? "font-semibold text-sambal-700" : "text-ink-soft",
          )}
          aria-live="polite"
        >
          {dirty ? <span className="size-2 shrink-0 rounded-full bg-sambal-500" aria-hidden="true" /> : null}
          {dirty ? "Ada perubahan yang belum disimpan." : "Dipakai untuk rekomendasi bahan."}
        </p>
        <Button onClick={() => save()} disabled={pending || !dirty} className="shrink-0">
          {pending ? "Menyimpan…" : "Simpan setelan"}
        </Button>
      </div>

      {needPin ? (
        <Link
          href="/pin?next=/pengaturan"
          className="mt-4 block rounded-panel bg-sambal-50 px-4 py-3 text-[15px] font-semibold text-sambal-700"
        >
          Masukkan PIN lagi
        </Link>
      ) : null}

      <ConfirmDialog
        open={pendingHref !== null}
        onClose={clearPending}
        title="Setelan belum disimpan"
        description="Perubahan cadangan stok akan hilang kalau kamu pindah halaman sekarang."
      >
        <Button onClick={() => pendingHref && save(() => leave(pendingHref))} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan lalu pindah"}
        </Button>
        <Button
          variant="dangerSoft"
          disabled={pending}
          onClick={() => {
            if (!pendingHref) return;
            const href = pendingHref;
            setValues(saved);
            leave(href);
          }}
        >
          Pindah tanpa menyimpan
        </Button>
        <Button variant="plain" onClick={clearPending} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={clearToast} />
    </section>
  );
}
