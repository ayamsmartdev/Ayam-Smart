import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "AYAMSMART",
  description: "Rekap penjualan, prediksi permintaan, dan rekomendasi bahan untuk warung ayam geprek.",
};

export const viewport: Viewport = {
  themeColor: "#fff8f0",
  viewportFit: "cover",
};

// Angka bergantung pada tanggal hari ini (WIB) → selalu dirender saat diminta.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full font-sans text-[16px] leading-normal antialiased">
        <div className="app-backdrop" aria-hidden="true" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
