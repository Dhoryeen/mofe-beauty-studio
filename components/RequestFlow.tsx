"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

type Service = { id: string; name: string; category: string };
type StaffMember = { id: string; name: string };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RequestForm({
  services,
  staff,
  groupId
}: {
  services: Service[];
  staff: StaffMember[];
  groupId?: string;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffPick, setStaffPick] = useState("match");
  const [date, setDate] = useState(() => dayKey(new Date(Date.now() + 86400000)));
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [readiness, setReadiness] = useState("");
  const [preferred, setPreferred] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "rounded-md border border-ink/20 bg-card px-3 py-2 text-sm";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        staffId: staffPick,
        location: location || undefined,
        slotStart: new Date(`${date}T${time}:00`).toISOString(),
        readinessDeadline: readiness || undefined,
        preferredTime: preferred || undefined,
        groupId
      })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    router.push(groupId ? `/groups/${groupId}` : `/bookings/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">
        Service — bridal, complex and off-site bookings need studio confirmation
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={input}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Requested date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Requested time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Preferred beautician (optional)
        <select value={staffPick} onChange={(e) => setStaffPick(e.target.value)} className={input}>
          <option value="match">Studio match</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Location (leave blank for in-studio; off-site needs confirmation + may add travel fees)
        <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ikoyi, Lagos — bride's home" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Must-be-ready-by (events, optional)
        <input type="datetime-local" value={readiness} onChange={(e) => setReadiness(e.target.value)} className={input} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Preferred service time (optional)
        <TextInput value={preferred} onChange={(e) => setPreferred(e.target.value)} placeholder="e.g. arrive 9:30" />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div><Button disabled={busy}>{busy ? "Sending…" : "Send request (no payment yet)"}</Button></div>
      <p className="text-xs text-muted">A request alone secures nothing — the studio confirms staffing and pricing, and shows any temporary hold with its expiry, before you pay.</p>
    </form>
  );
}

export function RequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [travel, setTravel] = useState("0");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState("48");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: string, body: object = {}) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">Travel ₦<TextInput inputMode="numeric" value={travel} onChange={(e) => setTravel(e.target.value)} /></label>
        <label className="grid flex-1 gap-1">Note<TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Staffing, timing, quote remarks" /></label>
        <Button disabled={busy} onClick={() => act("accept", { travelNaira: Number(travel) || 0, note })}>Accept + send quote</Button>
        <Button disabled={busy} variant="secondary" onClick={() => act("decline")}>Decline</Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">Extend hold (hours)<TextInput inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        <Button disabled={busy} variant="secondary" onClick={() => act("extend", { hours: Number(hours) || 48 })}>Extend hold</Button>
      </div>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
