"use client";

import { useEffect, useEffectEvent } from "react";

/** Notifikasi singkat di atas tab bar; hilang sendiri setelah 3,5 detik (pesan panjang lebih lama, maks 8 detik). */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const done = useEffectEvent(onDone);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => done(), Math.min(8000, Math.max(3500, message.length * 60)));
    return () => window.clearTimeout(t);
  }, [message]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-28 z-50 flex justify-center lg:bottom-8"
    >
      {message ? (
        <p className="glass-bar max-w-md rounded-2xl px-4 py-3 text-[14px] font-medium text-ink">
          {message}
        </p>
      ) : null}
    </div>
  );
}
