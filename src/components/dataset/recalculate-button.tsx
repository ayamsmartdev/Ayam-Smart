"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recalculateForecast } from "@/actions/forecast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Tombol hitung prediksi untuk dataset yang sedang tampil (T-18, D-32). Butuh PIN karena menulis hasil. */
export function RecalculateButton({
  dataset,
  returnTo,
  label = "Hitung ulang",
}: {
  dataset: "live" | "demo";
  returnTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [needPin, setNeedPin] = useState(false);

  const run = () =>
    startTransition(async () => {
      const result = await recalculateForecast(dataset).catch(() => null);
      if (!result) {
        setNeedPin(true);
        setMessage({ ok: false, text: "Sesi PIN mungkin habis. Masukkan PIN lalu coba lagi." });
        return;
      }
      setNeedPin(!result.ok && Boolean(result.needPin));
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={run} disabled={pending}>
        {pending ? "Menghitung…" : label}
      </Button>
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn("text-[13px] font-semibold", message.ok ? "text-daun-600" : "text-sambal-700")}
        >
          {message.text}
        </p>
      ) : null}
      {needPin ? (
        <Link href={`/pin?next=${encodeURIComponent(returnTo)}`} className="block text-[14px] font-semibold text-brand-700">
          Masukkan PIN
        </Link>
      ) : null}
    </div>
  );
}
