"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/design-system/Button";

type Item = {
  id: string;
  bookingId: string;
  email: string;
  slotStart: string | null;
  totalNaira: number;
  paidNaira: number;
  newStart?: string;
  amountNaira?: number;
  status: string;
};

export function ChangesInbox() {
  const [reschedules, setReschedules] = useState<Item[]>([]);
  const [refunds, setRefunds] = useState<Item[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/changes");
    const data = await res.json();
    if (res.ok) {
      setReschedules(data.reschedules);
      setRefunds(data.refunds);
    } else setError(data.error ?? "Load failed");
  }
  useEffect(() => {
    load();
  }, []);

  async function decide(url: string, approve: boolean) {
    setBusy(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, note })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setNote("");
    await load();
  }

  return (
    <div className="grid gap-5">
      {error && <p className="text-sm text-danger">{error}</p>}
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Reschedule requests ({reschedules.length})</h2>
        {reschedules.length === 0 && <p className="text-sm text-muted">None pending.</p>}
        {reschedules.map((r) => (
          <div key={r.id} className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
            <p><strong>{r.email}</strong> asks to move to <strong>{r.newStart ? new Date(r.newStart).toLocaleString() : ""}</strong></p>
            <p className="text-muted">Original slot stays confirmed until you decide. Current: {r.slotStart ? new Date(r.slotStart).toLocaleString() : ""}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => decide(`/api/admin/changes/reschedule/${r.id}`, true)}>Approve</Button>
              <Button disabled={busy} variant="secondary" onClick={() => decide(`/api/admin/changes/reschedule/${r.id}`, false)}>Reject with explanation</Button>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explanation for the client" className="flex-1 rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
            </div>
          </div>
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Refund requests ({refunds.length})</h2>
        {refunds.length === 0 && <p className="text-sm text-muted">None pending.</p>}
        {refunds.map((r) => (
          <div key={r.id} className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
            <p><strong>{r.email}</strong> — ₦{(r.amountNaira ?? 0).toLocaleString("en-NG")} (paid ₦{r.paidNaira.toLocaleString("en-NG")})</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => decide(`/api/admin/changes/refunds/${r.id}`, true)}>Approve + process refund</Button>
              <Button disabled={busy} variant="secondary" onClick={() => decide(`/api/admin/changes/refunds/${r.id}`, false)}>Reject with explanation</Button>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explanation / timing" className="flex-1 rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
