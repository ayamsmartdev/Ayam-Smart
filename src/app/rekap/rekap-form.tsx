"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { addDays, formatDayLong, relativeDayLabel } from "@/lib/date";
import type { Menu } from "@/lib/demo-data";
import { formatNumber } from "@/lib/format";

export function RekapForm({ menus, today }: { menus: Menu[]; today: string }) {
  const [date, setDate] = useState(today);
  const [closed, setClosed] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(menus.map((m) => [m.id, 0])),
  );
  const [toast, setToast] = useState<string | null>(null);

  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  const minDate = addDays(today, -30);

  return (
    <div className="space-y-5">
      <div className="glass flex items-center justify-between gap-2 rounded-panel p-2">
        <button
          type="button"
          onClick={() => setDate(addDays(date, -1))}
          disabled={date <= minDate}
          className="grid size-11 place-items-center rounded-full text-brand-700 hover:bg-white/60 disabled:opacity-35"
          aria-label="Hari sebelumnya"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="text-center" aria-live="polite">
          <p className="text-[16px] font-semibold">{relativeDayLabel(date, today)}</p>
          <p className="text-[13px] text-ink-soft">{formatDayLong(date)}</p>
        </div>
        <button
          type="button"
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
          className="grid size-11 place-items-center rounded-full text-brand-700 hover:bg-white/60 disabled:opacity-35"
          aria-label="Hari berikutnya"
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      <label className="glass flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-panel px-4">
        <span>
          <span className="block text-[16px] font-medium">Warung tutup</span>
          <span className="block text-[13px] text-ink-soft">Hari tutup tidak dipakai untuk prediksi</span>
        </span>
        <input
          type="checkbox"
          checked={closed}
          onChange={(e) => setClosed(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-8 w-13 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-7 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-daun-600 peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500"
        />
      </label>

      <section aria-labelledby="menu-heading" className={cn(closed && "pointer-events-none opacity-40")}>
        <h2 id="menu-heading" className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">
          Porsi terjual per menu
        </h2>
        <ul className="glass divide-y divide-line/70 rounded-panel">
          {menus.map((m) => (
            <li key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
              <span className="min-w-0 text-[16px] font-medium leading-snug">{m.name}</span>
              <Stepper
                label={m.name}
                value={qty[m.id]}
                onChange={(v) => setQty((prev) => ({ ...prev, [m.id]: v }))}
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="glass-bar sticky bottom-28 z-20 flex items-center justify-between gap-3 rounded-panel px-4 py-3 lg:bottom-5">
        <p className="text-[15px] text-ink-soft">
          Total{" "}
          <span className="text-[20px] font-bold tabular-nums text-ink">
            {closed ? "Tutup" : `${formatNumber(total)} porsi`}
          </span>
        </p>
        <Button
          onClick={() =>
            setToast(
              "Ini pratinjau: rekap belum disimpan karena database belum tersambung.",
            )
          }
          disabled={!closed && total === 0}
        >
          Simpan rekap
        </Button>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
