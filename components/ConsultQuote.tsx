"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

type StaffMember = { id: string; name: string };
type Slot = { start: string; end: string; staff: StaffMember[] };

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ConsultationBook({ services, staff }: { services: { id: string; name: string }[]; staff: StaffMember[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [mode, setMode] = useState<"in_person" | "video">("in_person");
  const [staffPick, setStaffPick] = useState("match");
  const [date, setDate] = useState(() => dayKey(new Date(Date.now() + 86400000)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSlotIdx(null);
    fetch(`/api/consultation-slots?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        const all: Slot[] = d.slots ?? [];
        setSlots(staffPick === "match" ? all : all.filter((s) => s.staff[0]?.id === staffPick));
      })
      .catch(() => setSlots([]));
  }, [date, staffPick]);

  async function book() {
    setError(null);
    const slot = slotIdx != null ? slots[slotIdx] : null;
    if (!slot) {
      setError("Pick a time slot.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        mode,
        staffId: slot.staff[0]?.id,
        slotStart: slot.start
      })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Booking failed");
      return;
    }
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    router.push(`/consultations/${data.consultationId}`);
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">1. Service + mode</h2>
        <div className="grid gap-2">
          {services.map((s) => (
            <button key={s.id} onClick={() => setServiceId(s.id)} className={`rounded-lg bg-card p-3 text-left text-sm shadow-card ${s.id === serviceId ? "ring-2 ring-gold" : ""}`}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "in_person" ? "primary" : "secondary"} onClick={() => setMode("in_person")}>In person</Button>
          <Button variant={mode === "video" ? "primary" : "secondary"} onClick={() => setMode("video")}>Video</Button>
        </div>
      </section>
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">2. Time</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
          <select value={staffPick} onChange={(e) => setStaffPick(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm">
            <option value="match">Any beautician</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          {slots.map((s, i) => (
            <button key={`${s.start}-${i}`} onClick={() => setSlotIdx(i)} className={`rounded-lg bg-card p-3 text-left text-sm shadow-card ${i === slotIdx ? "ring-2 ring-gold" : ""}`}>
              {fmt(s.start)} — {s.staff.map((x) => x.name).join(" + ")}
            </button>
          ))}
          {slots.length === 0 && <p className="text-sm text-muted">No consultation slots that day.</p>}
        </div>
      </section>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <Button onClick={book} disabled={busy}>{busy ? "Booking…" : "Book consultation (test mode)"}</Button>
      </div>
      <p className="text-xs text-muted">The fee, duration and attendance details are shown before you pay. Booking a consultation never books the beauty appointment itself.</p>
    </div>
  );
}

export function OutcomeForm({ id }: { id: string }) {
  const router = useRouter();
  const [f, setF] = useState({ recommendations: "", openQuestions: "", nextSteps: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", ...f })
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
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">Record outcome + complete</h2>
      <label className="grid gap-1 text-sm font-medium">Recommendations<textarea value={f.recommendations} onChange={(e) => setF({ ...f, recommendations: e.target.value })} rows={2} className={input} /></label>
      <label className="grid gap-1 text-sm font-medium">Unresolved questions<textarea value={f.openQuestions} onChange={(e) => setF({ ...f, openQuestions: e.target.value })} rows={2} className={input} /></label>
      <label className="grid gap-1 text-sm font-medium">Agreed next steps<textarea value={f.nextSteps} onChange={(e) => setF({ ...f, nextSteps: e.target.value })} rows={2} className={input} /></label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div><Button disabled={busy}>{busy ? "Saving…" : "Complete — issue client credit"}</Button></div>
    </form>
  );
}

export function ConsultationPay({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch(`/api/consultations/${id}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            const data = await res.json();
            setBusy(false);
            if (!res.ok) {
              setError(data.error ?? "Payment failed");
              return;
            }
            if (data.authorizationUrl) {
              window.location.href = data.authorizationUrl;
              return;
            }
            router.refresh();
          }}
        >
          {busy ? "Paying…" : "Pay consultation fee (test mode)"}
        </Button>
      </div>
    </div>
  );
}

export function CancelButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  return (
    <button
      className="rounded-full bg-black/10 px-3 py-1 text-xs"
      onClick={async () => {
        const res = await fetch(`/api/consultations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" })
        });
        if (res.ok) {
          router.refresh();
        }
      }}
    >
      {label}
    </button>
  );
}

export function TrialBook({ quoteId, staff }: { quoteId: string; staff: StaffMember[] }) {
  const router = useRouter();
  const [date, setDate] = useState(() => dayKey(new Date(Date.now() + 86400000)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const [staffPick, setStaffPick] = useState("match");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSlotIdx(null);
    fetch(`/api/consultation-slots?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        const all: Slot[] = d.slots ?? [];
        setSlots(staffPick === "match" ? all : all.filter((s) => s.staff[0]?.id === staffPick));
      })
      .catch(() => setSlots([]));
  }, [date, staffPick]);

  async function book() {
    setError(null);
    const slot = slotIdx != null ? slots[slotIdx] : null;
    if (!slot) {
      setError("Pick a time slot.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/quotes/${quoteId}/trials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotStart: slot.start, staffId: slot.staff[0]?.id })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Trial booking failed");
      return;
    }
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
        <select value={staffPick} onChange={(e) => setStaffPick(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm">
          <option value="match">Any beautician</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        {slots.map((s, i) => (
          <button key={`${s.start}-${i}`} onClick={() => setSlotIdx(i)} className={`rounded-lg bg-card p-3 text-left text-sm shadow-card ${i === slotIdx ? "ring-2 ring-gold" : ""}`}>
            {fmt(s.start)} — {s.staff.map((x) => x.name).join(" + ")}
          </button>
        ))}
        {slots.length === 0 && <p className="text-sm text-muted">No trial slots that day.</p>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div><Button onClick={book} disabled={busy}>{busy ? "Booking…" : "Book paid trial (test mode)"}</Button></div>
      <p className="text-xs text-muted">Trials are charged separately and never deducted from the service.</p>
    </div>
  );
}

export function TrialFeedback({ id }: { id: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await fetch(`/api/trials/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "feedback", feedback })
        });
        setBusy(false);
        router.refresh();
      }}
    >
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Trial outcome — what worked, what to change…" className="w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
      <div><Button disabled={busy}>{busy ? "Saving…" : "Save feedback + complete trial"}</Button></div>
    </form>
  );
}

export function DecideButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function decide(decision: string) {
    setBusy(true);
    const res = await fetch(`/api/quotes/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision })
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
    <div className="grid gap-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => decide("approved")}>Approve look + quote</Button>
        <Button disabled={busy} variant="secondary" onClick={() => decide("rejected")}>Reject</Button>
      </div>
      <p className="text-xs text-muted">Preparation starts only after you approve. Material changes need your renewed approval.</p>
    </div>
  );
}
