"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

export type Step = { key: string; label: string; state: "done" | "current" | "todo" };

export function ProgressView({ steps, next }: { steps: Step[]; next: { text: string; owner: string; deadline?: string } }) {
  return (
    <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">Progress</h2>
      <ol className="grid gap-1.5">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.state === "done" ? "bg-moss text-white" : s.state === "current" ? "bg-gold text-white" : "bg-black/10"}`}>
              {i + 1}
            </span>
            <span className={s.state === "current" ? "font-semibold" : s.state === "todo" ? "text-muted" : ""}>{s.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm">
        <strong>Next:</strong> {next.text} <span className="text-muted">({next.owner === "client" ? "you" : "studio"}{next.deadline ? ` · by ${next.deadline}` : ""})</span>
      </p>
    </div>
  );
}

export type Msg = { id: string; author: string; mine: boolean; body: string; imageUrl: string | null; displayUrl: string | null; at: string };

export function MessagesThread({ bookingId, initial }: { bookingId: string; initial: Msg[] }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setMsgs((m) => [...m, { id: data.id, author: "you", mine: true, body: body.trim(), imageUrl: null, displayUrl: null, at: new Date().toLocaleString() }]);
    setBody("");
    router.refresh();
  }

  async function sendPhoto(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/uploads", { method: "POST", body: fd });
    const upData = await up.json();
    if (!up.ok) {
      setError(upData.error ?? "Upload failed");
      setBusy(false);
      return;
    }
    const res = await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "", imageUrl: upData.url })
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">Messages</h2>
      <p className="text-xs text-muted">Private to this booking. If you agree a price or look change here, it still needs a formal quote revision to take effect.</p>
      <div className="grid max-h-64 gap-2 overflow-y-auto">
        {msgs.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-lg p-2 text-sm ${m.mine ? "justify-self-end bg-blush" : "bg-cream"}`}>
            <p className="text-xs text-muted">{m.author} · {m.at}</p>
            {m.body && <p>{m.body}</p>}
            {m.displayUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.displayUrl} alt="" className="mt-1 max-h-40 rounded-md" />
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <TextInput value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" aria-label="Message" />
        <Button disabled={busy}>Send</Button>
        <label className="cursor-pointer rounded-md border border-ink/20 px-3 py-2 text-sm">
          Photo
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => sendPhoto(e.target.files)} />
        </label>
      </form>
    </div>
  );
}

export type Task = { id: string; title: string; owner: string; status: string; dueAt: string | null };
export type Update = { id: string; author: string; body: string; kind: string; displayUrl: string | null; at: string };

export function PrepPanel({ bookingId, tasks, updates, isStudio }: { bookingId: string; tasks: Task[]; updates: Update[]; isStudio: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("studio");
  const [post, setPost] = useState("");
  const [isDelay, setIsDelay] = useState(false);
  const [busy, setBusy] = useState(false);

  async function call(body: object) {
    setBusy(true);
    const res = await fetch(`/api/bookings/${bookingId}/prep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
      <h2 className="font-semibold">Preparation</h2>
      <ul className="grid gap-1.5 text-sm">
        {tasks.length === 0 && <li className="text-muted">No preparation tasks yet.</li>}
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={(e) => call({ action: "task-done", id: t.id, done: e.target.checked })}
            />
            <span className={t.status === "done" ? "text-muted line-through" : ""}>{t.title}</span>
            <span className="text-xs text-muted">({t.owner === "client" ? "you" : "studio"}{t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString()}` : ""})</span>
          </li>
        ))}
      </ul>
      {isStudio && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) {
              call({ action: "task", title, owner });
              setTitle("");
            }
          }}
        >
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task, e.g. extensions ready" aria-label="Task title" />
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-md border border-ink/20 bg-card px-3 py-2 text-sm">
            <option value="studio">Studio does it</option>
            <option value="client">Client does it</option>
          </select>
          <Button disabled={busy}>Add task</Button>
        </form>
      )}
      <div className="grid gap-2">
        {updates.map((u) => (
          <div key={u.id} className={`rounded-lg p-2 text-sm ${u.kind === "delay" ? "bg-danger/10" : "bg-cream"}`}>
            <p className="text-xs text-muted">{u.author} · {u.at}{u.kind === "delay" ? " · delay notice" : ""}</p>
            <p>{u.body}</p>
            {u.displayUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.displayUrl} alt="" className="mt-1 max-h-40 rounded-md" />
            )}
          </div>
        ))}
      </div>
      {isStudio && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (post.trim()) {
              call({ action: "update", body: post, kind: isDelay ? "delay" : "update" });
              setPost("");
              setIsDelay(false);
            }
          }}
        >
          <textarea value={post} onChange={(e) => setPost(e.target.value)} rows={2} placeholder="Post a preparation update…" className="w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isDelay} onChange={(e) => setIsDelay(e.target.checked)} /> This is a delay — notify the client promptly with the revised plan</label>
          <div><Button disabled={busy}>Post update</Button></div>
        </form>
      )}
    </div>
  );
}

export function CancelPanel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ paidNaira: number; refundPreviewNaira: number; discretion: boolean; policy: string; message: string } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
      <h2 className="font-semibold">Cancel booking</h2>
      {!preview ? (
        <div>
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await fetch(`/api/bookings/${bookingId}/cancel`);
              setPreview(await res.json());
            }}
          >
            See cancellation terms
          </Button>
        </div>
      ) : done ? (
        <p>Cancelled. Any refund request is with the studio for review — you’ll be emailed the outcome.</p>
      ) : (
        <div className="grid gap-2">
          <p className="text-muted">{preview.policy}</p>
          <p>{preview.message}</p>
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" aria-label="Cancel reason" />
          <div>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reason })
                });
                setBusy(false);
                if (res.ok) {
                  setDone(true);
                  router.refresh();
                }
              }}
            >
              Confirm cancellation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CompletePanel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [aftercare, setAftercare] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch(`/api/bookings/${bookingId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aftercare })
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        router.refresh();
      }}
    >
      <h2 className="font-semibold">Mark service complete</h2>
      <textarea value={aftercare} onChange={(e) => setAftercare(e.target.value)} rows={2} placeholder="Personalised aftercare for the client…" className="w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
      {error && <p className="text-danger">{error}</p>}
      <div><Button disabled={busy}>Complete service</Button></div>
    </form>
  );
}

export function ReviewPanel({ bookingId, existing }: { bookingId: string; existing: { rating: number; body: string; publishConsent: boolean } | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (existing) {
    return (
      <div className="rounded-lg bg-card p-4 text-sm shadow-card">
        <h2 className="font-semibold">Your review</h2>
        <p>{"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)} · {existing.body || "No comment"}</p>
        <p className="text-muted">{existing.publishConsent ? "Publication consented." : "Kept private."}</p>
      </div>
    );
  }
  return (
    <form
      className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch(`/api/bookings/${bookingId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, body, publishConsent: consent })
        });
        setBusy(false);
        if (res.ok) router.refresh();
      }}
    >
      <h2 className="font-semibold">Review your service</h2>
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-32 rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" aria-label="Rating">
        {[5, 4, 3, 2, 1].map((r) => (
          <option key={r} value={r}>{r} star{r === 1 ? "" : "s"}</option>
        ))}
      </select>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="What did you love?" className="w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
      <label className="flex items-center gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> The studio may publish this review</label>
      <div><Button disabled={busy}>Submit review</Button></div>
    </form>
  );
}

export function FinalLookPanel({ bookingId, serviceId }: { bookingId: string; serviceId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
      <h2 className="font-semibold">Save final look</h2>
      {done ? (
        <p>Saved — <a href={`/looks/${done}`} className="underline">open it</a> or <a href={`/book?serviceId=${serviceId}`} className="underline">rebook this service at current prices</a>.</p>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await fetch(`/api/bookings/${bookingId}/final-look`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note, publishConsent: consent })
            });
            const data = await res.json();
            setBusy(false);
            if (res.ok) {
              setDone(data.id);
              router.refresh();
            }
          }}
        >
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notes for next time…" className="w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm" />
          <label className="flex items-center gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> The studio may publish my photos (unselected by default)</label>
          <div><Button disabled={busy}>Save final look</Button></div>
        </form>
      )}
      <p><a href={`/book?serviceId=${serviceId}`} className="underline">Rebook this service</a> — uses current prices and availability.</p>
    </div>
  );
}
