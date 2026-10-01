"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

const input = "w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm";

export function GroupCreate() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", eventDate: "", location: "", readinessDeadline: "", sizeInt: "3", payMode: "split", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        sizeInt: Number(f.sizeInt) || 1,
        eventDate: f.eventDate || undefined,
        readinessDeadline: f.readinessDeadline || undefined,
        location: f.location || undefined
      })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    router.push(`/groups/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid max-w-lg gap-3">
      <label className="grid gap-1 text-sm font-medium">Event / group name *<TextInput value={f.name} onChange={set("name")} required placeholder="e.g. Ada's wedding party" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Event date<input type="datetime-local" value={f.eventDate} onChange={set("eventDate")} className={input} /></label>
        <label className="grid gap-1 text-sm font-medium">Group size<input type="number" min={1} value={f.sizeInt} onChange={set("sizeInt")} className={input} /></label>
      </div>
      <label className="grid gap-1 text-sm font-medium">Location<TextInput value={f.location} onChange={set("location")} placeholder="Studio or off-site address" /></label>
      <label className="grid gap-1 text-sm font-medium">Must-be-ready-by<input type="datetime-local" value={f.readinessDeadline} onChange={set("readinessDeadline")} className={input} /></label>
      <label className="grid gap-1 text-sm font-medium">
        Who pays?
        <select value={f.payMode} onChange={set("payMode")} className={input}>
          <option value="split">Each member pays their share</option>
          <option value="organiser">I pay for everyone</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Notes<textarea value={f.note} onChange={set("note")} rows={2} className={input} /></label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div><Button disabled={busy}>{busy ? "Creating…" : "Create group request"}</Button></div>
    </form>
  );
}

type MemberRow = {
  userId: string;
  email: string;
  serviceName: string;
  slotStart: string | Date | null;
  quoteStatus: string | null;
  paymentStatus: string | null;
  bookingStatus: string | null;
  bookingId: string | null;
  missing: string[];
};

export function GroupTracker({
  groupId,
  viewerRole,
  payMode,
  sharedNaira,
  sharedNote,
  status,
  readiness,
  memberCount
}: {
  groupId: string;
  viewerRole: string;
  payMode: string;
  sharedNaira: number;
  sharedNote: string;
  status: string;
  readiness: MemberRow[];
  memberCount: number;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: object) {
    setMsg(null);
    setBusy(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Failed");
      return null;
    }
    return data;
  }

  const perHead = payMode === "split" && memberCount > 0 ? Math.ceil(sharedNaira / memberCount) : sharedNaira;

  return (
    <div className="grid gap-4">
      <div className="rounded-lg bg-card p-4 text-sm shadow-card">
        <p><strong>Shared charges:</strong> ₦{sharedNaira.toLocaleString("en-NG")}{sharedNote ? ` — ${sharedNote}` : ""}</p>
        <p className="text-muted">
          {payMode === "organiser" ? "The organiser pays shared charges and can cover member payments." : `Split across members ≈ ₦${perHead.toLocaleString("en-NG")} each (shown before anyone pays).`}
        </p>
        {status === "quoted" && viewerRole === "organiser" && (
          <div className="mt-2">
            <Button disabled={busy} onClick={async () => { const d = await call(`/api/groups/${groupId}`, "PATCH", { action: "accept-shared" }); if (d) router.refresh(); }}>
              Approve shared arrangements
            </Button>
          </div>
        )}
      </div>

      {viewerRole === "organiser" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = await call(`/api/groups/${groupId}/invite`, "POST", { email });
            if (d) {
              setEmail("");
              setMsg(d.added ? "Member added." : "No account yet — invite pending. They can be added once they sign up.");
              router.refresh();
            }
          }}
        >
          <label className="grid gap-1 text-sm font-medium">
            Invite member by email
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="member@example.com" />
          </label>
          <Button disabled={busy}>Invite</Button>
        </form>
      )}

      <div className="grid gap-2">
        {readiness.length === 0 && <p className="text-sm text-muted">No members yet — invite people to get started.</p>}
        {readiness.map((r) => (
          <div key={r.userId} className="grid gap-1 rounded-lg bg-card p-4 text-sm shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{r.email || "Member"}</p>
              <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{r.bookingStatus ?? "no booking"}</span>
            </div>
            <p className="text-muted">
              {r.serviceName || "no service yet"}
              {r.slotStart ? ` · ${new Date(r.slotStart).toLocaleString()}` : ""}
              {r.quoteStatus ? ` · quote ${r.quoteStatus}` : ""}
              {r.paymentStatus ? ` · ${r.paymentStatus}` : ""}
            </p>
            {r.missing.length > 0 && (
              <ul className="list-disc pl-5 text-danger">
                {r.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
            {viewerRole === "organiser" && r.bookingId && r.paymentStatus !== "paid" && (
              <div>
                <button
                  disabled={busy}
                  className="rounded-full bg-blush px-3 py-1 text-xs"
                  onClick={async () => {
                    const d = await call(`/api/groups/${groupId}/cover`, "POST", { bookingId: r.bookingId });
                    if (d?.authorizationUrl) window.location.href = d.authorizationUrl;
                    else if (d) router.refresh();
                  }}
                >
                  Cover this payment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <p className="text-xs text-muted">Members’ private notes and sensitivities stay visible only to them and assigned studio staff.</p>
    </div>
  );
}
