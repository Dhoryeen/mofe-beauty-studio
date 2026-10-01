"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Info = {
  kind?: string;
  bookingId?: string;
  consultationId?: string;
  quoteId?: string;
  paymentStatus?: string;
  status?: string;
};

export default function CallbackPage() {
  const params = useSearchParams();
  const reference = params.get("reference");
  const [state, setState] = useState<"checking" | "done" | "error">("checking");
  const [info, setInfo] = useState<Info>({});

  useEffect(() => {
    if (!reference) {
      setState("error");
      return;
    }
    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((d: Info) => {
        if (d.bookingId || d.consultationId || d.quoteId) {
          setInfo(d);
          setState("done");
        } else setState("error");
      })
      .catch(() => setState("error"));
  }, [reference]);

  if (state === "checking") return <p className="text-sm text-muted">Confirming your payment…</p>;
  if (state === "error")
    return (
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Payment not confirmed</h1>
        <p className="text-sm text-danger">We could not confirm this payment — you have not been charged for a booking. Please try again.</p>
        <p><a href="/book" className="text-sm underline">Back to booking</a></p>
      </div>
    );
  const target =
    info.bookingId ? `/bookings/${info.bookingId}` : info.consultationId ? `/consultations/${info.consultationId}` : `/quotes/${info.quoteId}`;
  const label = info.bookingId ? "booking" : info.consultationId ? "consultation" : "trial";
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold">Payment received</h1>
      <p className="text-sm text-muted">{label} {info.status} · {info.paymentStatus ?? ""}</p>
      <p><a href={target} className="text-sm underline">View your {label} and receipt</a></p>
    </div>
  );
}
