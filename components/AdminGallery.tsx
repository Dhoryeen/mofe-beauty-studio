"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

type Item = {
  id: string;
  title: string;
  service: string;
  occasion: string;
  finish: string | null;
  hairLength: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

const SERVICES = ["makeup", "hair", "combined"];
const OCCASIONS = ["bridal", "birthday", "everyday", "other"];
const FINISHES = ["", "natural", "soft-glam", "full-glam", "matte"];
const LENGTHS = ["", "short", "medium", "long", "extensions"];
const input = "w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm";

export function AdminGallery() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", service: "makeup", occasion: "everyday", finish: "", hairLength: "", sortOrder: "0" });
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/admin/gallery");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    else setError(data.error ?? "Load failed");
  }
  useEffect(() => {
    load();
  }, []);

  async function upload(f: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    try {
      const imageUrl = file ? await upload(file) : null;
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sortOrder: Number(form.sortOrder) || 0, imageUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setForm({ title: "", service: "makeup", occasion: "everyday", finish: "", hairLength: "", sortOrder: "0" });
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
    setBusy(false);
  }

  async function toggle(item: Item) {
    setBusy(true);
    const res = await fetch(`/api/admin/gallery/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active })
    });
    setBusy(false);
    if (res.ok) await load();
    else setError("Update failed");
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={create} className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Add gallery look</h2>
        <label className="grid gap-1 text-sm font-medium">
          Title *
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Soft bridal glam" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Service
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className={input}>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Occasion
            <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} className={input}>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Finish (optional)
            <select value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })} className={input}>
              {FINISHES.map((f) => (
                <option key={f} value={f}>{f === "" ? "—" : f}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Hair length (optional)
            <select value={form.hairLength} onChange={(e) => setForm({ ...form, hairLength: e.target.value })} className={input}>
              {LENGTHS.map((l) => (
                <option key={l} value={l}>{l === "" ? "—" : l}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Photo (JPEG/PNG/WebP, max 5MB) — use only client photos you have consent to publish
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div>
          <Button disabled={busy}>{busy ? "Saving…" : "Publish look"}</Button>
        </div>
      </form>

      <div className="grid gap-3">
        {items.map((g) => (
          <div key={g.id} className="flex items-center gap-4 rounded-lg bg-card p-3 shadow-card">
            {g.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.imageUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-blush text-[10px] text-muted">
                No photo
              </div>
            )}
            <div className="grid flex-1 gap-0.5">
              <p className="text-sm font-semibold">{g.title}</p>
              <p className="text-xs text-muted">
                {g.service} · {g.occasion}
                {g.finish ? ` · ${g.finish}` : ""} · {g.active ? "published" : "hidden"}
              </p>
            </div>
            <button disabled={busy} onClick={() => toggle(g)} className="rounded-full bg-black/10 px-3 py-1 text-xs">
              {g.active ? "Hide" : "Publish"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
