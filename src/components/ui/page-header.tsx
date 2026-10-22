import type { ReactNode } from "react";

/** Judul besar ala iOS. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pb-5 pt-4 landscape:max-lg:pt-2 sm:pt-6">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-[15px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
