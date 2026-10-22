import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "kriuk" | "brand" | "sambal" | "daun" | "neutral";

const tones: Record<Tone, string> = {
  kriuk: "bg-kriuk-50 text-kriuk-700 ring-kriuk-100",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  sambal: "bg-sambal-50 text-sambal-700 ring-sambal-50",
  daun: "bg-daun-50 text-daun-600 ring-daun-50",
  neutral: "bg-white/70 text-ink-soft ring-line",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Penanda wajib untuk data simulasi (AGENTS.md §9). */
export function SimulasiBadge({ className }: { className?: string }) {
  return (
    <Badge tone="kriuk" className={className} title="Angka di aplikasi ini adalah data simulasi">
      <span className="size-1.5 rounded-full bg-kriuk-500" aria-hidden="true" />
      Simulasi
    </Badge>
  );
}
