"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRekap, type SaveRekapResult } from "@/actions/rekap";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useLeaveGuard } from "@/components/hooks/use-leave-guard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { addDays, formatDayLong, relativeDayLabel } from "@/lib/date";
import { formatNumber } from "@/lib/format";

type Menu = { id: string; name: string; description: string | null };
type Initial = {
  qtyByMenu: Record<string, number>;
  closed: boolean;
  savedAt: string | null;
};

const MAX_DAYS_BACK = 30;

function formatSavedAt(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Rekap porsi terjual per kategori (cadangan bila penjualan tidak dari kasir).
 * Stok ayam dicatat di halaman Bahan; status & Hitung ulang prediksi ada di halaman Prediksi.
 */
export function RekapForm({
  menus,
  date,
  today,
  initial,
}: {
  menus: Menu[];
  date: string;
  today: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [closed, setClosed] = useState(initial.closed);
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(menus.map((m) => [m.id, initial.qtyByMenu[m.id] ?? 0])),
  );
  const [savedAt, setSavedAt] = useState(initial.savedAt);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = Object.values(qty).reduce((a, b) => a + b, 0);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const canPrev = prev >= addDays(today, -MAX_DAYS_BACK);
  const canNext = next <= today;
  const canSave = closed || total > 0;
  const { pendingHref, clearPending } = useLeaveGuard(dirty);

  /** Simpan rekap. True jika berhasil. Hasil kosong = proxy memotong permintaan (sesi PIN habis). */
  const persist = async (): Promise<boolean> => {
    const result: SaveRekapResult | null = await saveRekap({
      date,
      closed,
      items: menus.map((m) => ({ menuId: m.id, qty: qty[m.id] ?? 0 })),
    }).catch(() => null);
    if (!result || !result.ok) {
      setNeedPin(!result || Boolean(result.needPin));
      setToast(result ? result.error : "Rekap belum tersimpan. Sesi PIN mungkin habis, masukkan PIN lagi.");
      return false;
    }
    setNeedPin(false);
    setSavedAt(result.savedAt);
    setDirty(false);
    const saved = closed ? "Tersimpan: warung tutup." : `Rekap tersimpan: ${formatNumber(total)} porsi.`;
    // Rekap sudah aman walau prediksi gagal; alasan gagal ditampilkan apa adanya.
    setToast(
      !result.forecast
        ? saved
        : result.forecast.ok
          ? `${saved} Prediksi diperbarui.`
          : `${saved} Prediksi gagal diperbarui: ${result.forecast.message}`,
    );
    return true;
  };

  const save = () =>
    startTransition(async () => {
      if (await persist()) router.refresh();
    });

  const saveThenLeave = (href: string) =>
    startTransition(async () => {
      const ok = await persist();
      clearPending(); // tutup dialog; jika gagal, pesan kesalahan jadi terlihat
      if (ok) router.push(href);
    });

  const leaveWithoutSaving = (href: string) => {
    setDirty(false);
    clearPending();
    router.push(href);
  };

  const navClass =
    "grid size-11 place-items-center rounded-full text-brand-700 hover:bg-white/60 aria-disabled:pointer-events-none aria-disabled:opacity-35";

  const statusText = dirty
    ? "Ada perubahan yang belum disimpan."
    : savedAt
      ? `Sudah direkap, terakhir disimpan ${formatSavedAt(savedAt)}.`
      : "Belum direkap untuk tanggal ini.";

  return (
    <div className="space-y-5">
      <div className="glass flex items-center justify-between gap-2 rounded-panel p-2">
        <Link
          href={`/rekap?tanggal=${prev}`}
          aria-disabled={!canPrev}
          tabIndex={canPrev ? undefined : -1}
          className={navClass}
          aria-label="Hari sebelumnya"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div className="text-center">
          <p className="text-[16px] font-semibold">{relativeDayLabel(date, today)}</p>
          <p className="text-[13px] text-ink-soft">{formatDayLong(date)}</p>
        </div>
        <Link
          href={`/rekap?tanggal=${next}`}
          aria-disabled={!canNext}
          tabIndex={canNext ? undefined : -1}
          className={navClass}
          aria-label="Hari berikutnya"
        >
          <ChevronRightIcon className="size-5" />
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 px-1">
        <p
          className={cn(
            "flex items-center gap-2 text-[14px]",
            dirty ? "font-semibold text-sambal-700" : savedAt ? "font-medium text-daun-600" : "font-medium text-ink-soft",
          )}
          aria-live="polite"
        >
          {dirty ? <span className="size-2 shrink-0 rounded-full bg-sambal-500" aria-hidden="true" /> : null}
          {statusText}
        </p>
        <Link href={`/bahan?tanggal=${date}`} className="shrink-0 text-[14px] font-semibold text-brand-700">
          Catat stok →
        </Link>
      </div>

      <label className="glass flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-panel px-4">
        <span>
          <span className="block text-[16px] font-medium">Warung tutup</span>
          <span className="block text-[13px] text-ink-soft">Hari tutup tidak dipakai untuk prediksi</span>
        </span>
        <input
          type="checkbox"
          checked={closed}
          onChange={(e) => {
            setClosed(e.target.checked);
            setDirty(true);
          }}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-8 w-13 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-7 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-daun-600 peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500"
        />
      </label>

      <section aria-labelledby="menu-heading" className={cn(closed && "pointer-events-none opacity-40")}>
        <h2 id="menu-heading" className="mb-2 px-1 text-[15px] font-semibold text-ink-soft">
          Porsi terjual per kategori
        </h2>
        <ul className="glass divide-y divide-line/70 rounded-panel">
          {menus.map((m) => (
            <li key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-[16px] font-medium leading-snug">{m.name}</span>
                {m.description ? (
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{m.description}</span>
                ) : null}
              </span>
              <Stepper
                label={m.name}
                value={qty[m.id] ?? 0}
                onChange={(v) => {
                  setQty((prevQty) => ({ ...prevQty, [m.id]: v }));
                  setDirty(true);
                }}
                max={9999}
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-[13px] text-ink-soft">
          Setelah disimpan, prediksi dihitung ulang otomatis. Status dan Hitung ulang ada di halaman Prediksi.
        </p>
      </section>

      {needPin ? (
        <Link
          href={`/pin?next=/rekap`}
          className="block rounded-panel bg-sambal-50 px-4 py-3 text-[15px] font-semibold text-sambal-700"
        >
          Masukkan PIN lagi
        </Link>
      ) : null}

      <div className="glass-bar sticky bottom-28 z-20 flex items-center justify-between gap-3 rounded-panel px-4 py-3 lg:bottom-5">
        <p className="text-[15px] text-ink-soft">
          Total{" "}
          <span className="text-[20px] font-bold tabular-nums text-ink">
            {closed ? "Tutup" : `${formatNumber(total)} porsi`}
          </span>
        </p>
        <Button onClick={save} disabled={pending || !canSave}>
          {pending ? "Menyimpan…" : savedAt ? "Simpan perubahan" : "Simpan rekap"}
        </Button>
      </div>

      <ConfirmDialog
        open={pendingHref !== null}
        onClose={clearPending}
        title="Rekap belum disimpan"
        description={`Perubahan untuk ${relativeDayLabel(date, today).toLowerCase()} akan hilang kalau kamu pindah halaman sekarang.`}
      >
        {canSave ? (
          <Button onClick={() => pendingHref && saveThenLeave(pendingHref)} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan lalu pindah"}
          </Button>
        ) : null}
        <Button
          variant="dangerSoft"
          onClick={() => pendingHref && leaveWithoutSaving(pendingHref)}
          disabled={pending}
        >
          Pindah tanpa menyimpan
        </Button>
        <Button variant="plain" onClick={clearPending} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
