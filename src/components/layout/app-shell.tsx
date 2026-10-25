import Link from "next/link";
import type { ReactNode } from "react";
import { BrandWordmark } from "./brand-mark";
import { SidebarNav, TabBar } from "./nav";

/**
 * Kerangka aplikasi:
 * - < lg (HP & tablet portrait): top bar kaca + tab bar mengambang di bawah
 * - ≥ lg (tablet landscape & laptop): sidebar kaca di kiri
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex lg:gap-6 lg:p-5">
      <aside className="glass sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-64 shrink-0 flex-col rounded-hero p-4 lg:flex">
        <Link href="/" className="mb-6 rounded-row px-2 py-1.5">
          <BrandWordmark />
        </Link>
        <SidebarNav />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass-bar sticky top-0 z-30 rounded-b-[1.4rem] border-t-0 px-4 pt-[env(safe-area-inset-top)] lg:hidden">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between landscape:max-lg:h-12">
            <Link href="/" aria-label="AYAMSMART, ke beranda">
              <BrandWordmark />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-36 sm:px-6 lg:px-2 lg:pb-12">
          {children}
        </main>
      </div>

      <TabBar />
    </div>
  );
}
