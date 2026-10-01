"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  email: string;
  serviceName: string;
  dateFrom: string | null;
  dateTo: string | null;
  timeRange: string | null;
  note: string;
  status: string;
};

export function WaitlistAdmin() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/waitlist");
    const data = await res.json();
    if (res.ok) setRows(data.waitlist);
    else setError(data.error ?? "Load failed");
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/waitlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) await load();
    else setError("Update failed");
  }

  return (
    <div className="grid gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}
      {rows.length === 0 && <p className="text-sm text-muted">Waitlist is empty.</p>}
      {rows.map((w) => (
        <div key={w.id} className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{w.email} — {w.serviceName}</p>
            <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{w.status}</span>
          </div>
          <p className="text-xs text-muted">
            {[w.dateFrom, w.dateTo].filter(Boolean).join(" → ")}{w.timeRange ? ` · ${w.timeRange}` : ""}{w.note ? ` · ${w.note}` : ""}
          </p>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setStatus(w.id, "notified")} className="rounded-full bg-blush px-3 py-1">Mark notified</button>
            <button onClick={() => setStatus(w.id, "closed")} className="rounded-full bg-black/10 px-3 py-1">Close</button>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">Alerting a client never books or charges them — it only notifies.</p>
    </div>
  );
}
