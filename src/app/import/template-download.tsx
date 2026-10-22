"use client";

import { DownloadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

/** Membuat file template CSV di browser, tanpa server. */
export function TemplateDownload({ menuNames, sampleDate }: { menuNames: string[]; sampleDate: string }) {
  const download = () => {
    const rows = ["tanggal,menu,jumlah", ...menuNames.map((name) => `${sampleDate},${name},0`)];
    const blob = new Blob([`${rows.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-penjualan-ayamsmart.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={download}>
      <DownloadIcon className="size-5" />
      Unduh template
    </Button>
  );
}
