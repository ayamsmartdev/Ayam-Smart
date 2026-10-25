import { LinkButton } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

/** Pesan saat database tidak bisa dibaca (tanpa menampilkan detail galat). */
export function DatabaseDown({ what }: { what: string }) {
  return (
    <Panel>
      <p className="text-[16px] font-semibold">Database belum bisa dihubungi</p>
      <p className="mt-1 text-[15px] text-ink-soft">
        {what} tidak bisa dibuka sekarang. Coba muat ulang sebentar lagi, atau cek halaman Status.
      </p>
      <LinkButton href="/status" variant="secondary" className="mt-4">
        Buka status sistem
      </LinkButton>
    </Panel>
  );
}
