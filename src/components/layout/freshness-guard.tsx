"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { todayWIB } from "@/lib/date";

/**
 * Halaman statis (ISR, D-19) bisa tersaji sekali dalam versi lama setelah lama tidak dibuka,
 * misalnya pagi hari masih bertanggal kemarin. Jika tanggal render server ≠ tanggal WIB saat ini
 * di perangkat, minta data terbaru dari server sekali.
 */
export function FreshnessGuard({ renderedFor }: { renderedFor: string }) {
  const router = useRouter();

  useEffect(() => {
    if (todayWIB() !== renderedFor) router.refresh();
  }, [renderedFor, router]);

  return null;
}
