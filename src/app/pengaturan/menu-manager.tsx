"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createMenu,
  deleteMenu,
  moveMenu,
  setMenuActive,
  updateMenu,
  type MenuActionResult,
} from "@/actions/menus";
import { saveRecipe } from "@/actions/recipes";
import { useActionRunner } from "@/components/hooks/use-action-runner";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DialogError } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatNumber, formatQuantity } from "@/lib/format";
import { RecipeEditor, type RecipeIngredient } from "./recipe-editor";

/** Kategori menu (tabel `menus`, D-26). */
type Menu = { id: string; name: string; description: string | null; price: number | null; isActive: boolean };

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; menu: Menu }
  | { mode: "delete"; menu: Menu }
  | { mode: "recipe"; menu: Menu };

const inputClass =
  "min-h-12 w-full rounded-row bg-white/70 px-3 text-[16px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300";

function MenuForm({
  initial,
  pending,
  onSubmit,
}: {
  initial?: Menu;
  pending: boolean;
  onSubmit: (value: { name: string; description: string; price: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, description, price });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Nama kategori</span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          autoFocus
          placeholder="Contoh: Geprek bakar"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-medium text-ink-soft">Isi varian (opsional)</span>
        <textarea
          className={cn(inputClass, "min-h-20 resize-none py-2.5 leading-snug")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Contoh: sambel bawang, sambal ijo, mayosam, keju"
        />
        <span className="mt-1 block text-[13px] text-ink-soft">Tampil di Rekap sebagai pengingat menu apa saja yang masuk.</span>
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
        {pending ? "Menyimpan…" : "Simpan kategori"}
      </Button>
    </form>
  );
}

type RecipeItem = { ingredientId: string; qty: number };

/** Ringkasan resep di baris menu: maksimal 3 bahan, sisanya "+n". */
function RecipeSummary({ items, ingredients }: { items: RecipeItem[]; ingredients: RecipeIngredient[] }) {
  if (items.length === 0) {
    return <span className="mt-1.5 block text-[12px] font-medium text-kriuk-700">Resep belum diisi</span>;
  }
  const shown = items.slice(0, 3);
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {shown.map((it) => {
        const ing = ingredients.find((i) => i.id === it.ingredientId);
        if (!ing) return null;
        return (
          <Badge key={it.ingredientId} tone="neutral">
            {ing.name} {formatQuantity(it.qty, ing.unit)}
          </Badge>
        );
      })}
      {items.length > shown.length ? <Badge tone="neutral">+{items.length - shown.length}</Badge> : null}
    </span>
  );
}

export function MenuManager({
  menus,
  ingredients,
  recipes,
}: {
  menus: Menu[];
  ingredients: RecipeIngredient[];
  recipes: Record<string, RecipeItem[]>;
}) {
  const { run: runAction, pending, toast, clearToast, needPin, dialogError, clearDialogError } =
    useActionRunner();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const openDialog = (next: DialogState) => {
    clearDialogError();
    setDialog(next);
  };
  const close = () => openDialog({ mode: "closed" });

  const run = (action: () => Promise<MenuActionResult>, closeOnSuccess = true) =>
    runAction(action, {
      inDialog: dialog.mode !== "closed",
      onSuccess: closeOnSuccess ? close : undefined,
      onPinLost: close,
    });
  const activeCount = menus.filter((m) => m.isActive).length;
  const iconButton =
    "grid size-11 place-items-center rounded-full text-brand-700 hover:bg-white/70 disabled:opacity-30";

  return (
    <section aria-labelledby="menu-list-title">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 id="menu-list-title" className="text-[15px] font-semibold text-ink-soft">
            Kategori menu di Rekap harian
          </h2>
          <p className="text-[13px] text-ink-soft">
            {menus.length === 0
              ? "Belum ada kategori."
              : `${formatNumber(activeCount)} aktif dari ${formatNumber(menus.length)} kategori. Urutan di sini = urutan di Rekap.`}
          </p>
        </div>
        <Button onClick={() => openDialog({ mode: "create" })} className="shrink-0 px-4">
          <PlusIcon className="size-5" />
          Tambah
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="glass rounded-panel px-5 py-8 text-center">
          <p className="text-[16px] font-semibold">Mulai dari kategori yang paling laris</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-soft">
            Setiap kategori muncul sebagai satu baris di Rekap harian, misalnya Geprek bakar atau Lele. Harga boleh dikosongkan.
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
                {m.description ? (
                  <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{m.description}</span>
                ) : null}
                <span className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-soft">
                  {m.price != null ? `Rp ${formatNumber(m.price)}` : null}
                  {!m.isActive ? <Badge>Nonaktif</Badge> : null}
                </span>
                <RecipeSummary items={recipes[m.id] ?? []} ingredients={ingredients} />
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
        <p className="mt-2 px-1 text-[13px] text-ink-soft">Ketuk nama kategori untuk mengubah, mengatur resep, menonaktifkan, atau menghapus.</p>
      ) : null}

      {needPin ? (
        <Link
          href="/pin?next=/pengaturan"
          className="mt-4 block rounded-panel bg-sambal-50 px-4 py-3 text-[15px] font-semibold text-sambal-700"
        >
          Masukkan PIN lagi
        </Link>
      ) : null}

      <ConfirmDialog open={dialog.mode === "create"} onClose={close} title="Tambah kategori">
        {dialog.mode === "create" ? (
          <MenuForm pending={pending} onSubmit={(v) => run(() => createMenu(v))} />
        ) : null}
        <DialogError message={dialogError} />
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <ConfirmDialog open={dialog.mode === "edit"} onClose={close} title="Ubah kategori">
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
            <DialogError message={dialogError} />
            <Button variant="secondary" disabled={pending} onClick={() => openDialog({ mode: "recipe", menu: dialog.menu })}>
              Atur resep ({formatNumber((recipes[dialog.menu.id] ?? []).length)} bahan)
            </Button>
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
              Hapus kategori
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
        title="Hapus kategori?"
        description={
          dialog.mode === "delete"
            ? `"${dialog.menu.name}" akan dihapus permanen. Kategori yang sudah punya riwayat rekap tidak bisa dihapus; nonaktifkan saja.`
            : undefined
        }
      >
        {dialogError ? (
          <>
            <DialogError message={dialogError} />
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

      <ConfirmDialog
        open={dialog.mode === "recipe"}
        onClose={close}
        title="Resep per porsi"
        description={dialog.mode === "recipe" ? `Bahan yang dipakai untuk 1 porsi "${dialog.menu.name}".` : undefined}
      >
        {dialog.mode === "recipe" ? (
          <RecipeEditor
            key={dialog.menu.id}
            initial={recipes[dialog.menu.id] ?? []}
            ingredients={ingredients}
            pending={pending}
            onSave={(items) => {
              const id = dialog.menu.id;
              run(() => saveRecipe(id, items));
            }}
          />
        ) : null}
        <DialogError message={dialogError} />
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={clearToast} />
    </section>
  );
}
