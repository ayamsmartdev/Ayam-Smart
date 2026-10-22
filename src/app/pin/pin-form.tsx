"use client";

import { useActionState } from "react";
import { submitPin, type PinFormState } from "@/actions/pin";
import { Button } from "@/components/ui/button";

const initial: PinFormState = { error: null };

export function PinForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(submitPin, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-2 block text-[15px] font-medium text-ink-soft">PIN warung</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="current-password"
          minLength={4}
          maxLength={8}
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "pin-error" : undefined}
          className="h-14 w-full rounded-row bg-white/70 px-4 text-center text-[24px] font-bold tracking-[0.5em] tabular-nums ring-1 ring-line focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </label>
      {state.error ? (
        <p id="pin-error" role="alert" className="rounded-row bg-sambal-50 px-3 py-2 text-[14px] font-medium text-sambal-700">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memeriksa…" : "Buka"}
      </Button>
    </form>
  );
}
