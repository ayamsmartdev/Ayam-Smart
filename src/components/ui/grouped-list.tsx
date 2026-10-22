import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Daftar berkelompok ala iOS: satu permukaan kaca, baris dipisah garis tipis. */
export function GroupedList({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? (
        <h2 className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">{title}</h2>
      ) : null}
      <ul className="glass divide-y divide-line/70 overflow-hidden rounded-panel">{children}</ul>
      {footer ? <p className="mt-2 px-1 text-[13px] leading-relaxed text-ink-soft">{footer}</p> : null}
    </section>
  );
}

type RowProps = {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
};

export function ListRow({ leading, title, subtitle, trailing, href }: RowProps) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
      {href ? <ChevronRightIcon className="size-5 shrink-0 text-ink-faint" /> : null}
    </>
  );
  const rowClass = "flex min-h-14 items-center gap-3 px-4 py-3";
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(rowClass, "transition-colors hover:bg-white/50 active:bg-white/70")}>
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
