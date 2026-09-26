"use client";

import { useState } from "react";
import { LOOKS, SERVICES, SPECIALISTS, SLOTS, naira } from "@/lib/mock";
import { Button } from "@/components/design-system/Button";
import { QuoteTable } from "@/components/design-system/QuoteTable";
import { ApprovalBanner } from "@/components/design-system/ApprovalBanner";
import { MilestoneTracker } from "@/components/design-system/MilestoneTracker";
import { PaymentStatus } from "@/components/design-system/PaymentStatus";

const STEPS = ["Look", "Service", "Slot", "Payment", "Confirmed"] as const;

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [lookId, setLookId] = useState(LOOKS[0].id);
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [specialistId, setSpecialistId] = useState(SPECIALISTS[0].id);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [payMode, setPayMode] = useState<"deposit" | "full">("deposit");
  const [approved, setApproved] = useState(false);
  const [paid, setPaid] = useState(false);

  const look = LOOKS.find((l) => l.id === lookId)!;
  const service = SERVICES.find((s) => s.id === serviceId)!;
  const specialist = SPECIALISTS.find((s) => s.id === specialistId)!;
  const deposit = Math.round(service.price * 0.3);
  const dueNow = payMode === "deposit" ? deposit : service.price;

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Book a look — demo</h1>
        <p className="text-sm text-muted">
          Minimal clickable flow with mock data. No login, no database, no payments — every step
          runs locally in your browser.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`rounded-full px-3 py-1 ${i === step ? "bg-ink text-cream" : i < step ? "bg-moss text-white" : "bg-black/10"}`}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">1. Pick inspiration</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {LOOKS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLookId(l.id)}
                className={`rounded-lg bg-card p-4 text-left shadow-card ${l.id === lookId ? "ring-2 ring-gold" : ""}`}
              >
                <p className="text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-muted">{l.meta}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">2. Service + specialist</h2>
          <div className="grid gap-3">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`rounded-lg bg-card p-4 text-left shadow-card ${s.id === serviceId ? "ring-2 ring-gold" : ""}`}
              >
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted">{s.duration}</p>
                <p className="text-sm font-medium">
                  {naira(s.price)} {s.starting ? "· starting price" : "fixed"}
                </p>
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold">Specialist</h3>
            <div className="flex flex-wrap gap-2">
              {SPECIALISTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpecialistId(s.id)}
                  className={`rounded-full px-4 py-2 text-sm ${s.id === specialistId ? "bg-ink text-cream" : "bg-card shadow-card"}`}
                >
                  {s.name} · {s.role}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">3. Choose a slot</h2>
          {SLOTS.map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={`rounded-lg bg-card p-4 text-left text-sm shadow-card ${s === slot ? "ring-2 ring-gold" : ""}`}
            >
              {s}
            </button>
          ))}
          <ApprovalBanner state={approved ? "approved" : "awaiting"} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
            I approve this look summary and price (required before payment)
          </label>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">4. Mock payment</h2>
          <QuoteTable
            lines={[
              { label: "Service — " + service.name, amount: naira(service.price) },
              { label: payMode === "deposit" ? "Deposit due now (30%)" : "Full payment due now", amount: naira(dueNow) },
              { label: "Remaining balance (due on appointment day)", amount: naira(service.price - dueNow) }
            ]}
            total={naira(service.price)}
          />
          <div className="flex gap-2">
            <Button variant={payMode === "deposit" ? "primary" : "secondary"} onClick={() => setPayMode("deposit")}>
              Pay deposit
            </Button>
            <Button variant={payMode === "full" ? "primary" : "secondary"} onClick={() => setPayMode("full")}>
              Pay full
            </Button>
          </div>
          <Button
            disabled={!approved}
            onClick={() => {
              setPaid(true);
              next();
            }}
          >
            {approved ? `Pay ${naira(dueNow)} (mock)` : "Approve the look first"}
          </Button>
        </section>
      )}

      {step === 4 && (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Booking confirmed (mock)</h2>
          <div className="flex flex-wrap gap-2">
            <PaymentStatus status={paid ? (payMode === "deposit" ? "partially paid" : "paid") : "unpaid"} />
          </div>
          <div className="rounded-lg bg-card p-4 text-sm shadow-card">
            <p><strong>{look.title}</strong> · {look.meta}</p>
            <p>{service.name} with {specialist.name} — {slot}</p>
            <p className="text-muted">
              Paid now: {naira(dueNow)} · Balance due on the day: {naira(service.price - dueNow)}
            </p>
          </div>
          <MilestoneTracker current={4} />
          <p className="text-xs text-muted">
            Next: preparation instructions, 48h + 24h reminders, aftercare and receipt after the
            appointment. Restart the demo to try another path.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setStep(0);
              setPaid(false);
              setApproved(false);
            }}
          >
            Start over
          </Button>
        </section>
      )}

      {step < 4 && (
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
          )}
          {step < 3 && <Button onClick={next}>Continue</Button>}
        </div>
      )}
    </div>
  );
}
