import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { FreshnessGuard } from "@/components/layout/freshness-guard";
import { todayWIB } from "@/lib/date";

export const metadata: Metadata = {
  title: "AYAMSMART",
  description: "Rekap penjualan, prediksi permintaan, dan rekomendasi bahan untuk warung ayam geprek.",
};

export const viewport: Viewport = {
  themeColor: "#fff8f0",
  viewportFit: "cover",
};

// Halaman statis (ISR) yang dibuat ulang paling lama tiap 60 detik (D-19):
// cepat dibuka & bisa di-prefetch penuh, tanggal "hari ini" (WIB) tetap mutakhir.
// Saat halaman mulai membaca cookie/database, rute itu otomatis jadi dinamis — tinjau ulang D-19.
export const revalidate = 60;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full font-sans text-[16px] leading-normal antialiased">
        <div className="app-backdrop" aria-hidden="true" />
        <AppShell>{children}</AppShell>
        <FreshnessGuard renderedFor={todayWIB()} />
      </body>
    </html>
  );
}
