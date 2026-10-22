import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type PanelProps = HTMLAttributes<HTMLElement> & {
  /** `hero` = sudut paling besar untuk satu elemen utama per halaman. */
  variant?: "panel" | "hero";
  as?: "section" | "div" | "article";
};

/** Permukaan kaca. Radius berjenjang: hero > panel > baris. */
export function Panel({ variant = "panel", as: Tag = "section", className, ...props }: PanelProps) {
  return (
    <Tag
      className={cn(
        "glass",
        variant === "hero" ? "rounded-hero p-5 sm:p-7" : "rounded-panel p-4 sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

/** Judul di dalam panel (bukan label huruf kapital). */
export function PanelTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[17px] font-semibold tracking-tight", className)} {...props} />;
}
