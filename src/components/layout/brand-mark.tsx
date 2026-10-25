import Image from "next/image";

/**
 * Logo AYAMSMART dari klien (Q-07): ayam berpola sirkuit, tanpa tulisan melengkung supaya tetap terbaca di
 * ukuran kecil. Berkas: public/brand/ayamsmart-mark.png (latar transparan). Favicon & ikon tab:
 * src/app/favicon.ico, icon.png, apple-icon.png (konvensi Next.js).
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Image
      src="/brand/ayamsmart-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority
      className="shrink-0"
    />
  );
}

export function BrandWordmark() {
  return (
    <span className="flex items-center gap-2">
      <BrandMark />
      <span className="text-[17px] font-bold tracking-tight">AYAMSMART</span>
    </span>
  );
}
