"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createMenu,
  deleteMenu,
  moveMenu,
  setMenuActive,
  updateMenu,
  type MenuActionResult,
} from "@/actions/menus";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

type Menu = { id: string; name: string; price: number | null; isActive: boolean };

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; menu: Menu }
  | { mode: "delete"; menu: Menu };

const inputClass =
  "min-h-12 w-full rounded-row bg-white/70 px-3 text-[16px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300";

function MenuForm({
  initial,
  pending,
  onSubmit,
}: {
  initial?: Menu;
  pending: boolean;
  onSubmit: (value: { name: string; price: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, price });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Nama menu</span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          autoFocus
          placeholder="Contoh: Ayam geprek + nasi"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Harga (opsional)</span>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-[16px] text-ink-soft">
            Rp
          </span>
          <input
            className={cn(inputClass, "pl-10 tabular-nums")}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="15000"
          />
        </div>
      </label>
      <Button type="submit" className="w-full" disabled={pending || name.trim().length === 0}>
        {pending ? "Menyimpan…" : "Simpan menu"}
      </Button>
    </form>
  );
}

export function MenuManager({ menus }: { menus: Menu[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [toast, setToast] = useState<string | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [pending, startTransition] = useTransition();

  // Error saat dialog terbuka ditampilkan DI DALAM dialog: toast berada di belakang
  // lapisan modal sehingga tidak terbaca.
  const [dialogError, setDialogError] = useState<string | null>(null);
  const openDialog = (next: DialogState) => {
    setDialogError(null);
    setDialog(next);
  };

  const run = (action: () => Promise<MenuActionResult>, closeOnSuccess = true) =>
    startTransition(async () => {
      const inDialog = dialog.mode !== "closed";
      const result = await action().catch(() => null);
      const fail = (message: string, pin: boolean) => {
        setNeedPin(pin);
        if (inDialog && !pin) setDialogError(message);
        else {
          if (pin) openDialog({ mode: "closed" });
          setToast(message);
        }
      };
      if (!result) return fail("Belum tersimpan. Sesi PIN mungkin habis, masukkan PIN lagi.", true);
      if (!result.ok) return fail(result.error, Boolean(result.needPin));
      setNeedPin(false);
      setToast(result.message);
      if (closeOnSuccess) openDialog({ mode: "closed" });
      router.refresh();
    });

  const close = () => openDialog({ mode: "closed" });
  const activeCount = menus.filter((m) => m.isActive).length;
  const iconButton =
    "grid size-11 place-items-center rounded-full text-brand-700 hover:bg-white/70 disabled:opacity-30";

  return (
    <section aria-labelledby="menu-list-title">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 id="menu-list-title" className="text-[15px] font-semibold text-ink-soft">
            Menu di Rekap harian
          </h2>
          <p className="text-[13px] text-ink-soft">
            {menus.length === 0
              ? "Belum ada menu."
              : `${formatNumber(activeCount)} aktif dari ${formatNumber(menus.length)} menu. Urutan di sini = urutan di Rekap.`}
          </p>
        </div>
        <Button onClick={() => openDialog({ mode: "create" })} className="shrink-0 px-4">
          <PlusIcon className="size-5" />
          Tambah
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="glass rounded-panel px-5 py-8 text-center">
          <p className="text-[16px] font-semibold">Mulai dari menu yang paling sering dijual</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-soft">
            Setiap menu muncul sebagai satu baris di Rekap harian. Harga boleh diisi belakangan.
          </p>
        </div>
      ) : (
        <ul className="glass divide-y divide-line/70 overflow-hidden rounded-panel">
          {menus.map((m, i) => (
            <li key={m.id} className={cn("flex items-center gap-1 py-2 pl-4 pr-2", !m.isActive && "bg-ink/[.03]")}>
              <button
                type="button"
                onClick={() => openDialog({ mode: "edit", menu: m })}
                className="min-w-0 flex-1 rounded-row py-1 text-left"
              >
                <span className={cn("block truncate text-[16px] font-medium", !m.isActive && "text-ink-soft")}>
                  {m.name}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-soft">
                  {m.price != null ? `Rp ${formatNumber(m.price)}` : "Harga belum diisi"}
                  {!m.isActive ? <Badge>Nonaktif</Badge> : null}
                </span>
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => run(() => moveMenu(m.id, "up"), false)}
                disabled={pending || i === 0}
                aria-label={`Naikkan ${m.name}`}
              >
                <ChevronLeftIcon className="size-5 rotate-90" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => run(() => moveMenu(m.id, "down"), false)}
                disabled={pending || i === menus.length - 1}
                aria-label={`Turunkan ${m.name}`}
              >
                <ChevronLeftIcon className="size-5 -rotate-90" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {menus.length > 0 ? (
        <p className="mt-2 px-1 text-[13px] text-ink-soft">Ketuk nama menu untuk mengubah, menonaktifkan, atau menghapus.</p>
      ) : null}

      {needPin ? (
        <Link
          href="/pin?next=/pengaturan"
          className="mt-4 block rounded-panel bg-sambal-50 px-4 py-3 text-[15px] font-semibold text-sambal-700"
        >
          Masukkan PIN lagi
        </Link>
      ) : null}

      <ConfirmDialog open={dialog.mode === "create"} onClose={close} title="Tambah menu">
        {dialog.mode === "create" ? (
          <MenuForm pending={pending} onSubmit={(v) => run(() => createMenu(v))} />
        ) : null}
        {dialogError ? (
          <p role="alert" className="rounded-row bg-sambal-50 px-3 py-2 text-[14px] font-medium text-sambal-700">
            {dialogError}
          </p>
        ) : null}
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <ConfirmDialog open={dialog.mode === "edit"} onClose={close} title="Ubah menu">
        {dialog.mode === "edit" ? (
          <>
            <MenuForm
              key={dialog.menu.id}
              initial={dialog.menu}
              pending={pending}
              onSubmit={(v) => {
                const id = dialog.menu.id;
                run(() => updateMenu(id, v));
              }}
            />
            {dialogError ? (
              <p role="alert" className="rounded-row bg-sambal-50 px-3 py-2 text-[14px] font-medium text-sambal-700">
                {dialogError}
              </p>
            ) : null}
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                const { id, isActive } = dialog.menu;
                run(() => setMenuActive(id, !isActive));
              }}
            >
              {dialog.menu.isActive ? "Nonaktifkan (sembunyikan dari Rekap)" : "Aktifkan lagi"}
            </Button>
            <Button
              variant="dangerSoft"
              disabled={pending}
              onClick={() => openDialog({ mode: "delete", menu: dialog.menu })}
            >
              Hapus menu
            </Button>
          </>
        ) : null}
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog.mode === "delete"}
        onClose={close}
        title="Hapus menu?"
        description={
          dialog.mode === "delete"
            ? `"${dialog.menu.name}" akan dihapus permanen. Menu yang sudah punya riwayat rekap tidak bisa dihapus; nonaktifkan saja.`
            : undefined
        }
      >
        {dialogError ? (
          <>
            <p role="alert" className="rounded-row bg-sambal-50 px-3 py-2 text-[14px] font-medium text-sambal-700">
              {dialogError}
            </p>
            {dialog.mode === "delete" && dialog.menu.isActive ? (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  const id = dialog.menu.id;
                  run(() => setMenuActive(id, false));
                }}
              >
                Nonaktifkan saja
              </Button>
            ) : null}
          </>
        ) : (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (dialog.mode !== "delete") return;
              const id = dialog.menu.id;
              run(() => deleteMenu(id));
            }}
          >
            {pending ? "Menghapus…" : "Ya, hapus"}
          </Button>
        )}
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={() => setToast(null)} />
    </section>
  );
}
