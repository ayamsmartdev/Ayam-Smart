"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

/** Penghitung +/− dengan angka yang bisa diketik. Target sentuh 44px. */
export function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max = 999,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const roundButton =
    "grid size-11 place-items-center rounded-full bg-white/80 text-brand-700 ring-1 ring-brand-100 transition active:scale-95 disabled:opacity-35";

  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={roundButton}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Kurangi ${label}`}
      >
        <MinusIcon className="size-5" />
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          onChange(clamp(Number.isFinite(n) ? n : 0));
        }}
        className="h-11 w-14 rounded-row bg-white/60 text-center text-[20px] font-bold tabular-nums ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <button
        type="button"
        className={roundButton}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Tambah ${label}`}
      >
        <PlusIcon className="size-5" />
      </button>
    </div>
  );
}
