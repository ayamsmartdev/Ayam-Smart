"use client";

import { useEffect, useState } from "react";

/**
 * Cegah pindah halaman saat ada perubahan yang belum disimpan.
 *
 * - Klik link di dalam aplikasi (tab bar, sidebar, panah tanggal, dll.) ditahan dan
 *   alamat tujuannya dikembalikan lewat `pendingHref` → tampilkan dialog sendiri.
 * - Refresh/tutup tab memakai dialog bawaan browser (`beforeunload`); tampilannya
 *   tidak bisa diubah situs. Beberapa browser HP mungkin tidak menampilkannya.
 *
 * Catatan: tombol "kembali" bawaan browser/HP tidak bisa ditahan dengan andal di
 * App Router, jadi tidak dicegat.
 */
export function useLeaveGuard(active: boolean) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    // Fase capture di document berjalan SEBELUM handler <Link> Next.js di root React.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.getAttribute("aria-disabled") === "true") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const here = window.location.pathname + window.location.search;
      const there = url.pathname + url.search;
      if (there === here) return; // link ke halaman yang sama: tidak pindah

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(there + url.hash);
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Masih dibutuhkan sebagian browser lama agar dialog muncul.
      e.returnValue = "";
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active]);

  return { pendingHref, clearPending: () => setPendingHref(null) };
}
