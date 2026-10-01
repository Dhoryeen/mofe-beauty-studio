"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";
import { QuoteTable } from "@/components/design-system/QuoteTable";

type Service = { id: string; name: string; duration: string; priceNaira: number; priceType: string; category: string; consultRequired: boolean };
type StaffMember = { id: string; name: string; craft: string; bio: string };
type Slot = { start: string; end: string; staff: StaffMember[] };

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookFlow({ services, staff }: { services: Service[]; staff: StaffMember[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffPick, setStaffPick] = useState("match");
  const [date, setDate] = useState(() => dayKey(new Date(Date.now() + 86400000)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const [payMode, setPayMode] = useState<"deposit" | "full">("deposit");
  const [readiness, setReadiness] = useState("");
  const [preferred, setPreferred] = useState("");
  const [joinWait, setJoinWait] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const service = services.find((s) => s.id === serviceId)!;
  const needTwo = service?.category === "combined";
  const eligible = staff.filter((s) =>
    service?.category === "makeup"
      ? s.craft === "makeup" || s.craft === "both"
      : service?.category === "hair"
        ? s.craft === "hair" || s.craft === "both"
        : true
  );

  useEffect(() => {
    setSlotIdx(null);
    if (!serviceId || !date) return;
    setLoadingSlots(true);
    fetch(`/api/availability?serviceId=${serviceId}&date=${date}&staffId=${staffPick}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, date, staffPick]);

  const slot = slotIdx != null ? slots[slotIdx] : null;
  const deposit = service ? Math.round(service.priceNaira * 0.3) : 0;
  const dueNow = payMode === "deposit" ? deposit : (service?.priceNaira ?? 0);

  async function book() {
    setError(null);
    if (!slot) {
      setError("Pick a time slot.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        staffIds: slot.staff.map((s) => s.id),
        slotStart: slot.start,
        payMode,
        readinessDeadline: readiness || undefined,
        preferredTime: preferred || undefined
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
    router.push(`/bookings/${data.bookingId}`);
    router.refresh();
  }

  async function waitlist() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, dateFrom: date, dateTo: date, note })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Waitlist failed");
      return;
    }
    setJoinWait(false);
    setNote("");
    alert("You're on the waitlist — we'll alert you if a slot opens. No booking or charge was made.");
  }

  if (!service) return <p className="text-sm">No services available.</p>;

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">1. Service</h2>
        <div className="grid gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`rounded-lg bg-card p-4 text-left shadow-card ${s.id === serviceId ? "ring-2 ring-gold" : ""}`}
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-muted">{s.duration} · {naira(s.priceNaira)}{s.priceType === "starting" ? " starting" : " fixed"}</p>
              {s.consultRequired && <p className="text-xs text-danger">Needs studio confirmation — bookable after consultation (coming in a later phase).</p>}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">2. Specialist</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStaffPick("match")} className={`rounded-full px-4 py-2 text-sm ${staffPick === "match" ? "bg-ink text-cream" : "bg-card shadow-card"}`}>
            Studio match
          </button>
          {eligible.map((s) => (
            <button key={s.id} onClick={() => setStaffPick(s.id)} className={`rounded-full px-4 py-2 text-sm ${staffPick === s.id ? "bg-ink text-cream" : "bg-card shadow-card"}`}>
              {s.name}
            </button>
          ))}
        </div>
        {needTwo && <p className="text-xs text-muted">Combined looks need a makeup and a hair specialist — matching pairs you automatically.</p>}
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">3. Time</h2>
        <label className="grid max-w-xs gap-1 text-sm font-medium">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
        </label>
        {loadingSlots ? (
          <p className="text-sm text-muted">Checking availability…</p>
        ) : slots.length === 0 ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted">No bookable slots that day — every slot shown was capacity-checked.</p>
            {!joinWait ? (
              <div><Button variant="secondary" onClick={() => setJoinWait(true)}>Join free waitlist</Button></div>
            ) : (
              <div className="grid max-w-sm gap-2">
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Preferred time range, e.g. mornings" aria-label="Waitlist note" />
                <div><Button onClick={waitlist} disabled={busy}>Alert me (no charge)</Button></div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {slots.map((s, i) => (
              <button
                key={`${s.start}-${i}`}
                onClick={() => setSlotIdx(i)}
                className={`rounded-lg bg-card p-3 text-left text-sm shadow-card ${i === slotIdx ? "ring-2 ring-gold" : ""}`}
              >
                {fmt(s.start)} — {s.staff.map((x) => x.name).join(" + ")}
              </button>
            ))}
          </div>
        )}
        <div className="grid max-w-sm gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Must-be-ready-by (events, optional)
            <input type="datetime-local" value={readiness} onChange={(e) => setReadiness(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Preferred service time (optional)
            <TextInput value={preferred} onChange={(e) => setPreferred(e.target.value)} placeholder="e.g. arrive 9:30" />
          </label>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">4. Payment</h2>
        <QuoteTable
          lines={[
            { label: `Service — ${service.name}`, amount: naira(service.priceNaira) },
            { label: payMode === "deposit" ? "Deposit due now (30%)" : "Full payment due now", amount: naira(dueNow) },
            { label: "Balance due on appointment day", amount: naira(service.priceNaira - dueNow) }
          ]}
          total={naira(service.priceNaira)}
        />
        <div className="flex gap-2">
          <Button variant={payMode === "deposit" ? "primary" : "secondary"} onClick={() => setPayMode("deposit")}>Pay deposit</Button>
          <Button variant={payMode === "full" ? "primary" : "secondary"} onClick={() => setPayMode("full")}>Pay full</Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div>
          <Button onClick={book} disabled={busy || service.consultRequired}>
            {busy ? "Booking…" : service.consultRequired ? "Consultation required first" : `Confirm booking — ${naira(dueNow)} (test mode)`}
          </Button>
        </div>
      </section>
    </div>
  );
}
