"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LookActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(data.error ?? "Action failed");
      return null;
    }
    return data;
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <a href={`/looks/${id}`} className="rounded-full bg-ink px-3 py-1 text-cream">
        Open
      </a>
      <button
        disabled={busy}
        onClick={async () => {
          const data = await call(`/api/looks/${id}/duplicate`, "POST");
          if (data) {
            router.push(`/looks/${data.id}`);
            router.refresh();
          }
        }}
        className="rounded-full bg-black/10 px-3 py-1"
      >
        Duplicate
      </button>
      <button
        disabled={busy}
        onClick={async () => {
          const data = await call(`/api/looks/${id}`, "PATCH", {
            status: status === "archived" ? "draft" : "archived"
          });
          if (data) router.refresh();
        }}
        className="rounded-full bg-black/10 px-3 py-1"
      >
        {status === "archived" ? "Restore" : "Archive"}
      </button>
      <a href="/demo" className="rounded-full bg-blush px-3 py-1">
        Select for booking
      </a>
    </div>
  );
}
