"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

const input = "w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm";

export function QuoteCreate({ services, isManager }: { services: { id: string; name: string }[]; isManager: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    clientEmail: "", serviceId: services[0]?.id ?? "", lookId: "", makeup: "", hairstyle: "",
    extras: "", prepRequirements: "", travelNaira: "0", depositNaira: "", note: "", send: false
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        lookId: f.lookId || undefined,
        extras: f.extras.split(",").map((s) => s.trim()).filter(Boolean),
        travelNaira: Number(f.travelNaira) || 0,
        depositNaira: f.depositNaira === "" ? undefined : Number(f.depositNaira),
        send: isManager && f.send
      })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    router.push(`/quotes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">New quote {isManager ? "(manager)" : "(draft proposal — a manager sends it)"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Client email *<TextInput type="email" value={f.clientEmail} onChange={set("clientEmail")} required /></label>
        <label className="grid gap-1 text-sm font-medium">Service<select value={f.serviceId} onChange={set("serviceId")} className={input}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Look ID (optional)<TextInput value={f.lookId} onChange={set("lookId")} placeholder="from My looks" /></label>
        <label className="grid gap-1 text-sm font-medium">Travel fee ₦<TextInput inputMode="numeric" value={f.travelNaira} onChange={set("travelNaira")} /></label>
        <label className="grid gap-1 text-sm font-medium">Makeup<textarea value={f.makeup} onChange={set("makeup")} rows={2} className={input} /></label>
        <label className="grid gap-1 text-sm font-medium">Hairstyle<textarea value={f.hairstyle} onChange={set("hairstyle")} rows={2} className={input} /></label>
        <label className="grid gap-1 text-sm font-medium">Extras (comma-separated)<TextInput value={f.extras} onChange={set("extras")} /></label>
        <label className="grid gap-1 text-sm font-medium">Preparation requirements<textarea value={f.prepRequirements} onChange={set("prepRequirements")} rows={2} className={input} /></label>
        <label className="grid gap-1 text-sm font-medium">Deposit override ₦ (blank = 30%)<TextInput inputMode="numeric" value={f.depositNaira} onChange={set("depositNaira")} /></label>
        <label className="grid gap-1 text-sm font-medium">Studio note<textarea value={f.note} onChange={set("note")} rows={2} className={input} /></label>
      </div>
      {isManager && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.send} onChange={set("send")} /> Send to client for approval now</label>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div><Button disabled={busy}>{busy ? "Saving…" : isManager ? "Save quote" : "Save draft proposal"}</Button></div>
    </form>
  );
}

export function QuoteRevise({ id, initial, isManager }: { id: string; initial: Record<string, string | number | string[]>; isManager: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    makeup: String(initial.makeup ?? ""), hairstyle: String(initial.hairstyle ?? ""),
    prepRequirements: String(initial.prepRequirements ?? ""), travelNaira: String(initial.travelNaira ?? 0),
    note: "", send: true
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, travelNaira: Number(f.travelNaira) || 0, send: isManager && f.send })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    router.push(`/quotes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">Revise — creates a new version, keeps this one</h2>
      <label className="grid gap-1 text-sm font-medium">Makeup<textarea value={f.makeup} onChange={set("makeup")} rows={2} className={input} /></label>
      <label className="grid gap-1 text-sm font-medium">Hairstyle<textarea value={f.hairstyle} onChange={set("hairstyle")} rows={2} className={input} /></label>
      <label className="grid gap-1 text-sm font-medium">Preparation<textarea value={f.prepRequirements} onChange={set("prepRequirements")} rows={2} className={input} /></label>
      <label className="grid gap-1 text-sm font-medium">Travel fee ₦<TextInput inputMode="numeric" value={f.travelNaira} onChange={set("travelNaira")} /></label>
      <label className="grid gap-1 text-sm font-medium">Change note<textarea value={f.note} onChange={set("note")} rows={2} className={input} placeholder="What changed and why" /></label>
      {isManager && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.send} onChange={(e) => setF({ ...f, send: e.target.checked })} /> Send new version for approval</label>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div><Button disabled={busy}>{busy ? "Saving…" : "Save as new version"}</Button></div>
    </form>
  );
}
