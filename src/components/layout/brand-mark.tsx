/**
 * Logo sementara: squircle gradasi biru dengan paha ayam. Diganti saat logo final dari klien (PRD Q-07).
 * Gradasi memakai CSS (bukan <linearGradient> SVG) supaya tidak bergantung pada ID yang bisa bentrok
 * antar-instance atau ikut tersembunyi saat salah satu logo `display: none`.
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[30%] bg-linear-to-br from-brand-400 to-brand-700 shadow-[0_4px_12px_-4px_rgb(31_79_209_/_0.55)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 24 24">
        <g fill="#fff">
          <ellipse cx="14" cy="10" rx="6.2" ry="4.9" transform="rotate(-40 14 10)" />
          <path d="M10.2 13.8 6.6 17.4" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
          <circle cx="5.4" cy="17.2" r="1.5" />
          <circle cx="6.8" cy="18.8" r="1.5" />
        </g>
        <ellipse cx="15.8" cy="8.4" rx="2.1" ry="1.1" transform="rotate(-40 15.8 8.4)" fill="#fae6c2" />
      </svg>
    </span>
  );
}

export function BrandWordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-[17px] font-bold tracking-tight">AYAMSMART</span>
    </span>
  );
}
