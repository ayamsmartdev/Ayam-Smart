import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "dangerSoft" | "plain";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[transform,background-color,box-shadow] duration-150 active:scale-[.97] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_-8px_rgb(31_79_209_/_0.6)] hover:shadow-[0_10px_24px_-8px_rgb(31_79_209_/_0.7)]",
  secondary: "bg-white/70 text-brand-700 ring-1 ring-brand-200 hover:bg-white",
  danger:
    "bg-sambal-500 text-white shadow-[0_8px_20px_-10px_rgb(167_49_42_/_0.7)] hover:bg-sambal-700",
  dangerSoft: "bg-sambal-50 text-sambal-700 ring-1 ring-sambal-500/30 hover:bg-white",
  plain: "text-brand-600 hover:bg-brand-50",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={cn(base, variants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}
