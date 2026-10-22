"use client";

import { cn } from "@/lib/cn";

/** Segmented control ala iOS. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-full bg-ink/[.06] p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition-all",
              active ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgb(74_52_30_/_0.25)]" : "text-ink-soft",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
