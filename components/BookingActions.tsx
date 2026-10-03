"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";

export function BookingActions({ id, canPay, amountOwed }: { id: string; canPay: boolean; amountOwed: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newSlot, setNewSlot] = useState("");

  async function pay(kind: "due" | "balance") {
    setMsg(null);
    setBusy(true);
    const res = await fetch(`/api/bookings/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Payment failed");
      return;
    }
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    router.refresh();
  }

  async function reschedule(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotStart: new Date(newSlot).toISOString() })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Reschedule failed");
      return;
    }
    if (data.requested) {
      setInfo("Sent to the studio for approval — your original slot stays confirmed meanwhile.");
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {canPay && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => pay("due")}>Pay outstanding (test mode)</Button>
          <Button disabled={busy} variant="secondary" onClick={() => pay("balance")}>
            Pay full balance (₦{amountOwed.toLocaleString("en-NG")})
          </Button>
        </div>
      )}
      <form onSubmit={reschedule} className="grid max-w-sm gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Reschedule to (original stays confirmed until this succeeds)
          <input
            type="datetime-local"
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm"
          />
        </label>
        <div>
          <Button variant="secondary" disabled={busy || !newSlot}>Reschedule</Button>
        </div>
      </form>
      {msg && <p className="text-sm text-danger">{msg}</p>}
      {info && <p className="text-sm text-muted">{info}</p>}
    </div>
  );
}
