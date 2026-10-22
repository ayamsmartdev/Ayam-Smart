import type { SVGProps } from "react";

/** Ikon garis 24×24 buatan sendiri (tanpa library). Warna mengikuti `currentColor`. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Icon>
);

export const TrendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 17.5 9.5 12l3.5 3.5L20 8.5" />
    <path d="M15 8.5h5v5" />
  </Icon>
);

export const BasketIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 10h15l-1.6 8.4a1.5 1.5 0 0 1-1.5 1.1H7.6a1.5 1.5 0 0 1-1.5-1.1z" />
    <path d="M9 10 12 4.5 15 10" />
  </Icon>
);

export const NoteIcon = (p: P) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="16.5" rx="2.5" />
    <path d="M9 9h6M9 12.5h6M9 16h3.5" />
  </Icon>
);

export const BinIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7" />
    <path d="m6.5 7 .9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12" />
    <path d="M10.2 11v5.5M13.8 11v5.5" />
  </Icon>
);

export const MoreIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);

export const SlidersIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
);

export const UploadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" />
    <path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
  </Icon>
);

export const InfoIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);

export const ChevronRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

export const ChevronLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);

export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const DrumstickIcon = (p: P) => (
  <Icon {...p}>
    <path d="M15.6 4.2a5.3 5.3 0 0 1 4.2 6.9c-.9 2.7-3.9 4.4-6.7 3.8l-2.6 2.6a2 2 0 1 1-2.8 2.8 2 2 0 1 1-2.8-2.8 2 2 0 1 1 2.8-2.8l2.6-2.6c-.6-2.8 1.1-5.8 3.8-6.7a5.3 5.3 0 0 1 1.5-.2z" />
  </Icon>
);

export const DownloadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4.5v11M7.5 11 12 15.5 16.5 11" />
    <path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
  </Icon>
);
