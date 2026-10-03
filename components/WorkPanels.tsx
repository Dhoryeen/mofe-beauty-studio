"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

type Rule = { id: string; weekday: number; startMin: number; endMin: number };
type Exception = { id: string; day: string; startMin: number | null; endMin: number | null; reason: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function hm(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function AvailabilityEditor({ staffId }: { staffId?: string }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [day, setDay] = useState("2026-10-10");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState<Record<number, { s: string; e: string }>>({});
  const qs = staffId ? `?staffId=${staffId}` : "";

  async function load() {
    const res = await fetch(`/api/staff/availability${qs}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Load failed");
      return;
    }
    setRules(data.rules);
    setExceptions(data.exceptions);
    const h: Record<number, { s: string; e: string }> = {};
    for (const r of data.rules as Rule[]) h[r.weekday] = { s: hm(r.startMin), e: hm(r.endMin) };
    setHours(h);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveDay(wd: number) {
    const h = hours[wd];
    if (!h) return;
    setError(null);
    const res = await fetch("/api/staff/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, type: "rule", weekday: wd, startMin: toMin(h.s), endMin: toMin(h.e) })
    });
    if (!res.ok) setError((await res.json()).error ?? "Save failed");
    await load();
  }

  async function clearDay(wd: number) {
    const r = rules.find((x) => x.weekday === wd);
    if (!r) return;
    await fetch(`/api/staff/availability?id=${r.id}&kind=rule`, { method: "DELETE" });
    await load();
  }

  async function blockDay(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/staff/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, type: "exception", day, reason })
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    setReason("");
    await load();
  }

  return (
    <div className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">My availability</h2>
      <p className="text-xs text-muted">Changing hours never cancels existing bookings — booked slots stay valid.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid gap-2">
        {DAYS.map((d, wd) => (
          <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-10 font-medium">{d}</span>
            <input type="time" value={hours[wd]?.s ?? "09:00"} onChange={(e) => setHours({ ...hours, [wd]: { s: e.target.value, e: hours[wd]?.e ?? "18:00" } })} className="rounded-md border border-ink/20 bg-cream px-2 py-1 text-sm" aria-label={`${d} start`} />
            <input type="time" value={hours[wd]?.e ?? "18:00"} onChange={(e) => setHours({ ...hours, [wd]: { s: hours[wd]?.s ?? "09:00", e: e.target.value } })} className="rounded-md border border-ink/20 bg-cream px-2 py-1 text-sm" aria-label={`${d} end`} />
            <Button variant="secondary" onClick={() => saveDay(wd)}>Set</Button>
            {rules.some((r) => r.weekday === wd) && (
              <button onClick={() => clearDay(wd)} className="text-xs underline">Day off</button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={blockDay} className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">Time off (whole day)<input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="rounded-md border border-ink/20 bg-cream px-2 py-1 text-sm" /></label>
        <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Reason" />
        <Button variant="secondary">Block day</Button>
      </form>
      {exceptions.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {exceptions.map((x) => (
            <li key={x.id} className="flex items-center gap-2">
              <span>Off {x.day}{x.reason ? ` — ${x.reason}` : ""}</span>
              <button
                className="text-xs underline"
                onClick={async () => {
                  await fetch(`/api/staff/availability?id=${x.id}&kind=exception`, { method: "DELETE" });
                  await load();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
