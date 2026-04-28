"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  rowIndex: number;
};

export function PaymentUnverifyButton({ slug, rowIndex }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unverify() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sponsors/${slug}/payments/${rowIndex}/verify`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unverify failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-emerald-300" title="verified">
        ✓
      </span>
      <button
        type="button"
        onClick={unverify}
        disabled={submitting}
        title="Mark as unverified"
        className="text-[10px] uppercase tracking-wider text-muted/60 hover:text-rose-300 transition-colors disabled:opacity-50"
      >
        {submitting ? "…" : "undo"}
      </button>
      {error && (
        <span
          className="text-[10px] text-rose-300 truncate max-w-[140px]"
          title={error}
        >
          {error}
        </span>
      )}
    </span>
  );
}
