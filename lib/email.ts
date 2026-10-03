import { Resend } from "resend";

let client: Resend | null = null;

function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function from() {
  return process.env.EMAIL_FROM ?? "onboarding@resend.dev";
}

function base(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="margin:0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#faf5ef;color:#241a17;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="font-weight:700;font-size:20px;letter-spacing:-0.01em;">Mofe Beauty Studio</div>
<h1 style="font-size:22px;">${title}</h1>
${body}
<p style="font-size:12px;color:#7a6a64;">Sent from your Mofe Beauty Studio test environment. Inspiration photos guide discussion and do not guarantee an identical result.</p>
</div></div></body></html>`;
}

// Sending must never break a booking or payment — failures log and return false.
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const r = resend();
  if (!r) {
    console.warn("[email] skipped — RESEND_API_KEY not set");
    return false;
  }
  try {
    const { error } = await r.emails.send({ from: from(), to: opts.to, subject: opts.subject, html: opts.html });
    if (error) {
      console.warn("[email] Resend error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[email] send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function appUrl() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export function bookingConfirmationEmail(o: {
  name: string;
  service: string;
  slot: string;
  staff: string;
  paid: number;
  total: number;
  bookingId: string;
}) {
  return {
    subject: `Booking confirmed — ${o.service}`,
    html: base(
      "Booking confirmed",
      `<p>Hi ${o.name},</p>
<p>Your <strong>${o.service}</strong> is confirmed for <strong>${o.slot}</strong>${o.staff ? ` with ${o.staff}` : ""}.</p>
<p>Paid: <strong>${naira(o.paid)}</strong> of ${naira(o.total)}. Any balance is due on appointment day.</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">View your booking and receipt</a></p>`
    )
  };
}

export function quoteAwaitingEmail(o: { name: string; service: string; total: number; validUntil: string; quoteId: string }) {
  return {
    subject: `Your look + quote is ready to review`,
    html: base(
      "Your look and quote is ready",
      `<p>Hi ${o.name},</p>
<p>The studio has prepared your <strong>${o.service}</strong> look summary and personalised quote of <strong>${naira(o.total)}</strong>, valid until ${o.validUntil}.</p>
<p>Preparation starts only after you approve — please review every detail, including the price.</p>
<p><a href="${appUrl()}/quotes/${o.quoteId}">Review and approve</a></p>`
    )
  };
}

export function consultationBookedEmail(o: { name: string; service: string; mode: string; slot: string; consultationId: string }) {
  return {
    subject: `Consultation booked — ${o.service}`,
    html: base(
      "Consultation booked",
      `<p>Hi ${o.name},</p>
<p>Your <strong>${o.mode === "video" ? "video" : "in-person"} consultation</strong> for <strong>${o.service}</strong> is booked for <strong>${o.slot}</strong>.</p>
<p>The paid fee credits once against your beauty appointment. Booking this consultation does not book the appointment itself.</p>
<p><a href="${appUrl()}/consultations/${o.consultationId}">View your consultation</a></p>`
    )
  };
}

export function reminderEmail(o: { name: string; service: string; slot: string; kind: string; bookingId: string }) {
  const when = o.kind === "24h" ? "tomorrow (24 hours)" : "in 2 days (48 hours)";
  return {
    subject: `Reminder: ${o.service} ${o.kind === "24h" ? "tomorrow" : "in 2 days"}`,
    html: base(
      "Appointment reminder",
      `<p>Hi ${o.name},</p>
<p>Your <strong>${o.service}</strong> is ${when}: <strong>${o.slot}</strong>.</p>
<p>Please complete any preparation tasks and arrive on time. Reply in your booking messages if anything changed.</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">View your booking</a></p>`
    )
  };
}

export function refundDecidedEmail(o: { name: string; amount: number; approved: boolean; note: string; bookingId: string }) {
  return {
    subject: o.approved ? `Refund approved — ${naira(o.amount)}` : `Refund request reviewed`,
    html: base(
      o.approved ? "Refund approved" : "Refund update",
      o.approved
        ? `<p>Hi ${o.name},</p>
<p>A refund of <strong>${naira(o.amount)}</strong> was approved${o.note ? ` — ${o.note}` : ""}. It should reach your original payment method shortly; card refunds can take a few business days.</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">View your booking</a></p>`
        : `<p>Hi ${o.name},</p>
<p>The studio reviewed your refund request and could not approve it${o.note ? ` — ${o.note}` : ""}. Reply in your booking messages if you have questions.</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">View your booking</a></p>`
    )
  };
}

export function reviewRequestEmail(o: { name: string; service: string; bookingId: string }) {
  return {
    subject: `How was your ${o.service}?`,
    html: base(
      "How did it go?",
      `<p>Hi ${o.name},</p>
<p>Thanks for visiting Mofe Beauty Studio. Please leave a quick review of your <strong>${o.service}</strong> — one per booking, published only with your consent.</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">Leave a review</a></p>`
    )
  };
}

export function rescheduleNoticeEmail(o: { name: string; service: string; oldSlot: string; newSlot: string; bookingId: string }) {
  return {
    subject: `Appointment moved — ${o.service}`,
    html: base(
      "Appointment rescheduled",
      `<p>Hi ${o.name},</p>
<p>Your <strong>${o.service}</strong> moved from <strong>${o.oldSlot}</strong> to <strong>${o.newSlot}</strong>.</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">View your booking</a></p>`
    )
  };
}

export function delayNoticeEmail(o: { name: string; service: string; body: string; bookingId: string }) {
  return {
    subject: `Preparation update — ${o.service}`,
    html: base(
      "Preparation update",
      `<p>Hi ${o.name},</p>
<p>An update on your <strong>${o.service}</strong> preparation:</p>
<p>${o.body}</p>
<p><a href="${appUrl()}/bookings/${o.bookingId}">View your booking</a></p>`
    )
  };
}
