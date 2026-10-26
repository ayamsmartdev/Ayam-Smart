"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveStock } from "@/actions/rekap";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useLeaveGuard } from "@/components/hooks/use-leave-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { addDays, formatDayLong, relativeDayLabel } from "@/lib/date";
import type { StockInputItem, StockValues } from "@/lib/stock";
import {
  EMPTY_DRAFT,
  parseInt0,
  parseKg,
  sanitizeStockField,
  StockCard,
  type StockCardIngredient,
  type StockDraft,
  stockDraftError,
} from "./stock-card";

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

const toText = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

function initialDraft(v: StockValues | undefined): StockDraft {
  if (!v) return EMPTY_DRAFT;
  return { kg: toText(v.boughtKg), pieces: toText(v.boughtPieces), leftover: toText(v.leftover) };
}

/**
 * Catat stok ayam (D-29) di halaman Bahan: belanja (kg + potong opsional) kapan saja, sisa freezer saat tutup.
 * Selalu data warung (`live`). Porsi terjual dibaca dari rekap yang sudah tersimpan untuk menghitung selisih.
 */
export function StockSection({
  ingredients,
  date,
  today,
  stockByIngredient,
  previousLeftover,
  qtyByMenu,
  closed,
  stockSavedAt,
  wasteByIngredient,
}: {
  ingredients: StockCardIngredient[];
  date: string;
  today: string;
  stockByIngredient: Record<string, StockValues>;
  previousLeftover: Record<string, number | null>;
  qtyByMenu: Record<string, number>;
  closed: boolean;
  stockSavedAt: string | null;
  wasteByIngredient: Record<string, number>;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, StockDraft>>(() =>
    Object.fromEntries(ingredients.map((i) => [i.id, initialDraft(stockByIngredient[i.id])])),
  );
  const [savedAt, setSavedAt] = useState(stockSavedAt);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [pending, startTransition] = useTransition();
  const { pendingHref, clearPending } = useLeaveGuard(dirty);

  const invalid = ingredients.some((i) => stockDraftError(drafts[i.id] ?? EMPTY_DRAFT) !== null);
  const hasValues = ingredients.some((i) => Object.values(drafts[i.id] ?? EMPTY_DRAFT).some((v) => v !== ""));
  const salesTotal = Object.values(qtyByMenu).reduce((a, b) => a + b, 0);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const canPrev = prev >= addDays(today, -MAX_DAYS_BACK);
  const canNext = next <= today;

  const update = (id: string, field: keyof StockDraft, raw: string) => {
    const value = sanitizeStockField(field, raw);
    if (value === null) return; // ketikan tidak sesuai format (mis. 3 desimal) diabaikan
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? EMPTY_DRAFT), [field]: value } }));
    setDirty(true);
  };

  const payload = (): StockInputItem[] =>
    ingredients.map((i) => {
      const d = drafts[i.id] ?? EMPTY_DRAFT;
      return { ingredientId: i.id, boughtKg: parseKg(d.kg), boughtPieces: parseInt0(d.pieces), leftover: parseInt0(d.leftover) };
    });

  /** Simpan; hasil kosong = proxy/sesi memotong permintaan (PIN habis). */
  const persist = async (): Promise<boolean> => {
    const result = await saveStock({ date, stock: payload() }).catch(() => null);
    if (!result || !result.ok) {
      setNeedPin(!result || Boolean(result.needPin));
      setToast(result ? result.error : "Stok belum tersimpan. Sesi PIN mungkin habis, masukkan PIN lagi.");
      return false;
    }
    setNeedPin(false);
    setSavedAt(hasValues ? result.savedAt : null);
    setDirty(false);
    setToast(hasValues ? "Stok tersimpan." : "Catatan stok tanggal ini dihapus.");
    return true;
  };

  const save = () =>
    startTransition(async () => {
      if (await persist()) router.refresh();
    });

  const saveThenLeave = (href: string) =>
    startTransition(async () => {
      const ok = await persist();
      clearPending();
      if (ok) router.push(href);
    });

  const navClass =
    "grid size-11 place-items-center rounded-full text-brand-700 hover:bg-white/60 aria-disabled:pointer-events-none aria-disabled:opacity-35";

  return (
    <section aria-labelledby="stok-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id="stok-title" className="text-[17px] font-semibold tracking-tight">
          Catat stok ayam
        </h2>
        <Badge tone="daun">
          <span className="size-1.5 rounded-full bg-daun-600" aria-hidden="true" />
          Data warung
        </Badge>
      </div>

      <div className="glass flex items-center justify-between gap-2 rounded-panel p-2">
        <Link
          href={`/bahan?tanggal=${prev}`}
          aria-disabled={!canPrev}
          tabIndex={canPrev ? undefined : -1}
          className={navClass}
          aria-label="Hari sebelumnya"
          scroll={false}
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div className="text-center">
          <p className="text-[16px] font-semibold">{relativeDayLabel(date, today)}</p>
          <p className="text-[13px] text-ink-soft">{formatDayLong(date)}</p>
        </div>
        <Link
          href={`/bahan?tanggal=${next}`}
          aria-disabled={!canNext}
          tabIndex={canNext ? undefined : -1}
          className={navClass}
          aria-label="Hari berikutnya"
          scroll={false}
        >
          <ChevronRightIcon className="size-5" />
        </Link>
      </div>

      {closed ? (
        <p className="px-1 text-[13px] text-ink-soft">Tanggal ini ditandai warung tutup; stok freezer tetap bisa dicatat.</p>
      ) : salesTotal === 0 ? (
        <p className="px-1 text-[13px] text-ink-soft">
          Porsi terjual tanggal ini belum direkap, jadi selisih stok belum bisa dihitung.{" "}
          <Link href={`/rekap?tanggal=${date}`} className="font-semibold text-brand-700">
            Isi rekap
          </Link>
        </p>
      ) : null}

      <StockCard
        ingredients={ingredients}
        drafts={drafts}
        previousLeftover={previousLeftover}
        qtyByMenu={qtyByMenu}
        salesFilled={salesTotal > 0}
        closed={closed}
        dirty={dirty}
        invalid={invalid}
        pending={pending}
        savedLabel={savedAt ? `Stok tersimpan ${formatSavedAt(savedAt)}.` : null}
        wasteByIngredient={wasteByIngredient}
        onChange={update}
        onSave={save}
      />

      {needPin ? (
        <Link
          href="/pin?next=/bahan"
          className="block rounded-panel bg-sambal-50 px-4 py-3 text-[15px] font-semibold text-sambal-700"
        >
          Masukkan PIN lagi
        </Link>
      ) : null}

      <ConfirmDialog
        open={pendingHref !== null}
        onClose={clearPending}
        title="Stok belum disimpan"
        description={`Catatan stok untuk ${relativeDayLabel(date, today).toLowerCase()} akan hilang kalau kamu pindah halaman sekarang.`}
      >
        {!invalid ? (
          <Button onClick={() => pendingHref && saveThenLeave(pendingHref)} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan lalu pindah"}
          </Button>
        ) : null}
        <Button
          variant="dangerSoft"
          onClick={() => {
            const href = pendingHref;
            setDirty(false);
            clearPending();
            if (href) router.push(href);
          }}
          disabled={pending}
        >
          Pindah tanpa menyimpan
        </Button>
        <Button variant="plain" onClick={clearPending} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={() => setToast(null)} />
    </section>
  );
}
