import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { safeNextPath } from "@/lib/pin-token";
import { PinForm } from "./pin-form";

export const metadata: Metadata = { title: "Masukkan PIN · AYAMSMART", robots: { index: false } };

export default async function PinPage({ searchParams }: PageProps<"/pin">) {
  const { next } = await searchParams;
  const target = safeNextPath(typeof next === "string" ? next : undefined);

  return (
    <>
      <PageHeader title="Masukkan PIN" subtitle="Diperlukan untuk mengisi atau mengubah data" />
      <Panel className="mx-auto max-w-sm">
        <PinForm next={target} />
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
          Cukup sekali di perangkat ini; PIN diingat selama 30 hari. Beranda dan prediksi tetap bisa
          dilihat tanpa PIN.
        </p>
      </Panel>
    </>
  );
}
