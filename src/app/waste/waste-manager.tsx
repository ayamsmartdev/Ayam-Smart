"use client";

import { useState } from "react";
import { addWaste, deleteWaste, updateWaste } from "@/actions/waste";
import { useActionRunner } from "@/components/hooks/use-action-runner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DialogError } from "@/components/ui/confirm-dialog";
import { GroupedList, ListRow } from "@/components/ui/grouped-list";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { Toast } from "@/components/ui/toast";
import { formatDayShort } from "@/lib/date";
import { formatQuantity } from "@/lib/format";
import { WASTE_REASON_LABEL, type WasteKind, type WasteReason } from "@/lib/waste";
import { WasteForm, type WasteFormValue, type WasteOption } from "./waste-form";

export type WasteHistoryRow = {
  id: number;
  date: string;
  kind: WasteKind;
  itemId: string;
  itemName: string;
  unit: string;
  qty: number;
  reason: WasteReason;
  note: string | null;
};

type Dialog = { mode: "closed" } | { mode: "edit"; row: WasteHistoryRow } | { mode: "delete"; row: WasteHistoryRow };

/** Catat waste baru + riwayat 30 hari (ubah/hapus). Semua aksi cek PIN di server. */
export function WasteManager({
  menus,
  bahan,
  rows,
  today,
  minDate,
}: {
  menus: WasteOption[];
  bahan: WasteOption[];
  rows: WasteHistoryRow[];
  today: string;
  minDate: string;
}) {
  const { run, pending, toast, clearToast, needPin, dialogError, clearDialogError } = useActionRunner();
  const [dialog, setDialog] = useState<Dialog>({ mode: "closed" });
  const [formKey, setFormKey] = useState(0);
  const close = () => {
    clearDialogError();
    setDialog({ mode: "closed" });
  };

  return (
    <>
      <Panel aria-labelledby="waste-form-title">
        <PanelTitle id="waste-form-title">Catat waste</PanelTitle>
        <div className="mt-4">
          <WasteForm
            key={formKey}
            menus={menus}
            bahan={bahan}
            today={today}
            minDate={minDate}
            pending={pending}
            submitLabel="Catat waste"
            onSubmit={(v) => run(() => addWaste(v), { onSuccess: () => setFormKey((k) => k + 1) })}
          />
        </div>
        {needPin ? (
          <a href="/pin?next=/waste" className="mt-4 block text-[15px] font-semibold text-sambal-700">
            Masukkan PIN lagi
          </a>
        ) : null}
      </Panel>

      <GroupedList
        title="Riwayat 30 hari"
        footer={rows.length > 0 ? "Ketuk catatan untuk mengubah atau menghapus." : undefined}
      >
        {rows.length === 0 ? (
          <li className="px-4 py-4 text-[15px] text-ink-soft">Belum ada catatan waste.</li>
        ) : (
          rows.map((w) => (
            <ListRow
              key={w.id}
              onClick={() => setDialog({ mode: "edit", row: w })}
              title={w.itemName}
              subtitle={`${formatDayShort(w.date)}, ${WASTE_REASON_LABEL[w.reason].toLowerCase()}${w.note ? ` · ${w.note}` : ""}`}
              trailing={
                <span className="text-[16px] font-semibold tabular-nums text-sambal-700">
                  {formatQuantity(w.qty, w.unit)}
                </span>
              }
            />
          ))
        )}
      </GroupedList>

      <ConfirmDialog open={dialog.mode === "edit"} onClose={close} title="Ubah catatan waste">
        {dialog.mode === "edit" ? (
          <>
            <WasteForm
              key={dialog.row.id}
              menus={menus}
              bahan={bahan}
              today={today}
              minDate={minDate}
              initial={{ ...dialog.row, note: dialog.row.note ?? "" }}
              pending={pending}
              submitLabel="Simpan perubahan"
              onSubmit={(v: WasteFormValue) => {
                const id = dialog.row.id;
                run(() => updateWaste(id, v), { inDialog: true, onSuccess: close, onPinLost: close });
              }}
            />
            <DialogError message={dialogError} />
            <Button variant="dangerSoft" disabled={pending} onClick={() => setDialog({ mode: "delete", row: dialog.row })}>
              Hapus catatan ini
            </Button>
            <Button variant="plain" onClick={close} disabled={pending}>
              Batal
            </Button>
          </>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog.mode === "delete"}
        onClose={close}
        title="Hapus catatan waste?"
        description={
          dialog.mode === "delete"
            ? `${dialog.row.itemName} ${formatQuantity(dialog.row.qty, dialog.row.unit)} (${formatDayShort(dialog.row.date)}) akan dihapus.`
            : undefined
        }
      >
        <DialogError message={dialogError} />
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (dialog.mode !== "delete") return;
            const id = dialog.row.id;
            run(() => deleteWaste(id), { inDialog: true, onSuccess: close, onPinLost: close });
          }}
        >
          {pending ? "Menghapus…" : "Hapus"}
        </Button>
        <Button variant="plain" onClick={close} disabled={pending}>
          Batal
        </Button>
      </ConfirmDialog>

      <Toast message={toast} onDone={clearToast} />
    </>
  );
}
