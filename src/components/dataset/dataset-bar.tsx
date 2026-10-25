"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDataset } from "@/actions/dataset";
import { Badge, SimulasiBadge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";

type Mode = "live" | "demo";

/**
 * Penanda + pilihan sumber angka di Beranda/Prediksi/Bahan (F9, D-32).
 * Simulasi selalu berlabel jelas; pilihan disimpan per browser (cookie), tanpa PIN.
 */
export function DatasetBar({
  dataset,
  auto,
  liveDays,
  liveMinDays,
}: {
  dataset: Mode;
  auto: boolean;
  liveDays: number;
  liveMinDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (mode: Mode | "auto") =>
    startTransition(async () => {
      await setDataset(mode).catch(() => null);
      router.refresh();
    });

  const note = auto
    ? dataset === "demo"
      ? `Dipilih otomatis: data warung baru ${liveDays} hari, perlu minimal ${liveMinDays} hari.`
      : "Dipilih otomatis karena data warung sudah cukup."
    : dataset === "demo"
      ? "Angka di halaman ini simulasi, bukan data warung."
      : "Angka di halaman ini dari rekap warung.";

  return (
    <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 rounded-panel px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {dataset === "demo" ? (
            <SimulasiBadge />
          ) : (
            <Badge tone="daun">
              <span className="size-1.5 rounded-full bg-daun-600" aria-hidden="true" />
              Data warung
            </Badge>
          )}
          {!auto ? (
            <button
              type="button"
              onClick={() => choose("auto")}
              disabled={pending}
              className="text-[13px] font-semibold text-brand-700 disabled:opacity-50"
            >
              Pilih otomatis
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-ink-soft">{note}</p>
      </div>
      <Segmented
        label="Sumber data"
        value={dataset}
        onChange={(v) => v !== dataset && choose(v)}
        options={[
          { value: "live", label: "Data warung" },
          { value: "demo", label: "Simulasi" },
        ]}
        className={pending ? "opacity-60" : undefined}
      />
    </div>
  );
}
