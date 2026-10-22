"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  BasketIcon,
  BinIcon,
  HomeIcon,
  MoreIcon,
  NoteIcon,
  SlidersIcon,
  TrendIcon,
  UploadIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const SIDEBAR_ITEMS: Item[] = [
  { href: "/", label: "Beranda", icon: HomeIcon },
  { href: "/prediksi", label: "Prediksi", icon: TrendIcon },
  { href: "/bahan", label: "Bahan", icon: BasketIcon },
  { href: "/rekap", label: "Rekap harian", icon: NoteIcon },
  { href: "/waste", label: "Food waste", icon: BinIcon },
  { href: "/pengaturan", label: "Menu & resep", icon: SlidersIcon },
  { href: "/import", label: "Import CSV", icon: UploadIcon },
];

const TAB_ITEMS: Item[] = [
  { href: "/", label: "Beranda", icon: HomeIcon },
  { href: "/prediksi", label: "Prediksi", icon: TrendIcon },
  { href: "/rekap", label: "Rekap", icon: NoteIcon },
  { href: "/waste", label: "Waste", icon: BinIcon },
  { href: "/lainnya", label: "Lainnya", icon: MoreIcon },
];

/** Halaman yang dibuka dari tab "Lainnya" tetap menandai tab itu aktif. */
const UNDER_LAINNYA = ["/lainnya", "/bahan", "/pengaturan", "/import"];

function isActive(pathname: string, href: string, isTab: boolean): boolean {
  if (href === "/") return pathname === "/";
  if (isTab && href === "/lainnya") return UNDER_LAINNYA.some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama">
      <ul className="space-y-1">
        {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href, false);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-row px-3 text-[15px] font-medium transition-colors",
                  active
                    ? "bg-white/85 text-brand-700 shadow-[0_4px_14px_-6px_rgb(74_52_30_/_0.25)]"
                    : "text-ink-soft hover:bg-white/50 hover:text-ink",
                )}
              >
                <Icon className="size-[22px]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md lg:hidden"
    >
      <ul className="glass-bar grid grid-cols-5 rounded-[1.6rem] px-1.5 py-1.5">
        {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href, true);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[11px] font-semibold transition-colors landscape:max-lg:min-h-10 landscape:max-lg:flex-row landscape:max-lg:gap-1.5",
                  active ? "bg-white/80 text-brand-700" : "text-ink-soft",
                )}
              >
                <Icon className="size-[22px]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
