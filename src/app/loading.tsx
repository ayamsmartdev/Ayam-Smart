/**
 * Kerangka halaman yang tampil seketika saat rute berikutnya masih dimuat dari server.
 * Bentuknya meniru PageHeader + panel supaya perpindahan tidak terasa melompat.
 */
export default function Loading() {
  const block = "animate-pulse rounded-row bg-white/60 motion-reduce:animate-none";
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      <div className="space-y-2 pb-5 pt-4 sm:pt-6" aria-hidden="true">
        <div className={`${block} h-8 w-44`} />
        <div className={`${block} h-4 w-60`} />
      </div>
      <div className="space-y-5" aria-hidden="true">
        <div className="glass h-48 rounded-hero p-5">
          <div className={`${block} h-4 w-40`} />
          <div className={`${block} mt-5 h-14 w-56`} />
        </div>
        <div className="glass h-64 rounded-panel" />
      </div>
    </div>
  );
}
