"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  rowIndex: number;
  initialDate: string;
  initialMethod: string;
};

const DATE_PLACEHOLDER_RE = /^\d{4}-XX-XX$/i;

export function PaymentVerifyButton({
  slug,
  rowIndex,
  initialDate,
  initialMethod,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    DATE_PLACEHOLDER_RE.test(initialDate) ? "" : initialDate,
  );
  const [method, setMethod] = useState(
    initialMethod === "?" ? "" : initialMethod,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sponsors/${slug}/payments/${rowIndex}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: date.trim() || undefined,
            method: method.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "verify failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-amber-300 hover:text-amber-200 transition-colors text-[11px] uppercase tracking-wider"
      >
        verify
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="YYYY-MM-DD"
        className="text-[11px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 w-[88px] focus:outline-none focus:border-accent/60"
      />
      <input
        type="text"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        placeholder="method"
        className="text-[11px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 w-[80px] focus:outline-none focus:border-accent/60"
      />
      <button
        type="submit"
        disabled={submitting}
        className="text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25 disabled:opacity-50"
      >
        {submitting ? "…" : "save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-[11px] text-muted/60 hover:text-foreground"
      >
        cancel
      </button>
      {error && (
        <span
          className="text-[10px] text-rose-300 ml-1 truncate max-w-[200px]"
          title={error}
        >
          {error}
        </span>
      )}
    </form>
  );
}
