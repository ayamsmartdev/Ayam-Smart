import { UploadIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { addDays, todayWIB } from "@/lib/date";
import { DEMO_MENUS } from "@/lib/demo-data";
import { TemplateDownload } from "./template-download";

const steps = [
  {
    title: "Unduh template",
    body: "Kolomnya tanggal (format 2026-10-23), nama menu persis seperti di daftar menu, dan jumlah porsi.",
  },
  {
    title: "Isi data penjualan",
    body: "Satu baris untuk satu menu per hari. Hari tanpa penjualan karena tutup tidak perlu ditulis.",
  },
  {
    title: "Unggah file",
    body: "Aplikasi memeriksa setiap baris dan menampilkan yang bermasalah sebelum data disimpan.",
  },
];

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Import CSV" subtitle="Masukkan riwayat penjualan sekaligus" />
      <div className="space-y-5">
        <Panel aria-label="Langkah import">
          <ol className="space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[15px] font-bold text-brand-700"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[16px] font-semibold">{s.title}</p>
                  <p className="mt-0.5 max-w-prose text-[14px] leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <TemplateDownload
              menuNames={DEMO_MENUS.map((m) => m.name)}
              sampleDate={addDays(todayWIB(), -1)}
            />
          </div>
        </Panel>

        <div className="glass flex flex-col items-center gap-2 rounded-panel border-2 border-dashed border-brand-200 px-6 py-10 text-center">
          <UploadIcon className="size-8 text-brand-500" />
          <p className="text-[16px] font-semibold">Unggah file CSV</p>
          <p className="max-w-xs text-[14px] text-ink-soft">
            Tersedia setelah database tersambung. Template sudah bisa diunduh dan diisi dari sekarang.
          </p>
        </div>
      </div>
    </>
  );
}
