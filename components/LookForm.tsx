"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

export type GalleryPick = { id: string; title: string };
export type BoardImage = { url: string; source: string; galleryItemId: string | null; label: string };

const OCCASIONS = ["bridal", "birthday", "everyday", "other"];
const FINISHES = ["", "natural", "soft-glam", "full-glam", "matte"];

export function LookForm({
  lookId,
  initial,
  gallery,
  preselected
}: {
  lookId?: string;
  initial?: Record<string, string>;
  gallery: GalleryPick[];
  preselected?: string | null;
}) {
  const router = useRouter();
  const [fields, setFields] = useState({
    name: initial?.name ?? "",
    occasion: initial?.occasion ?? "everyday",
    makeupPreferences: initial?.makeupPreferences ?? "",
    hairstyle: initial?.hairstyle ?? "",
    hairLengthTexture: initial?.hairLengthTexture ?? "",
    finish: initial?.finish ?? "",
    avoidDetails: initial?.avoidDetails ?? "",
    sensitivities: initial?.sensitivities ?? "",
    productPreferences: initial?.productPreferences ?? ""
  });
  const [picked, setPicked] = useState<string[]>(preselected ? [preselected] : []);
  const [uploads, setUploads] = useState<BoardImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof fields) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setFields((f) => ({ ...f, [k]: e.target.value }));
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setUploads((u) => [...u, { url: data.url, source: "upload", galleryItemId: null, label: file.name }]);
    }
  }

  const board: BoardImage[] = [
    ...picked.map((id) => {
      const g = gallery.find((x) => x.id === id);
      return { url: "", source: "gallery", galleryItemId: id, label: g?.title ?? id };
    }),
    ...uploads
  ];

  async function save() {
    setError(null);
    if (!fields.name.trim()) {
      setError("Give your look a name.");
      return;
    }
    setBusy(true);
    const payload = {
      ...fields,
      images: board.map((b) => ({ url: b.url, source: b.source, galleryItemId: b.galleryItemId }))
    };
    const res = await fetch(lookId ? `/api/looks/${lookId}` : "/api/looks", {
      method: lookId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    router.push(lookId ? `/looks/${lookId}` : `/looks/${data.id}`);
    router.refresh();
  }

  const input = "w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm";

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Look name *
          <TextInput value={fields.name} onChange={set("name")} placeholder="e.g. My birthday glam" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Occasion
          <select value={fields.occasion} onChange={set("occasion")} className={input}>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Makeup preferences
          <textarea value={fields.makeupPreferences} onChange={set("makeupPreferences")} rows={2} className={input} placeholder="Skin work, eyes, lips…" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Hairstyle
          <textarea value={fields.hairstyle} onChange={set("hairstyle")} rows={2} className={input} placeholder="Updo, silk press, curls…" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Hair length / texture
          <TextInput value={fields.hairLengthTexture} onChange={set("hairLengthTexture")} placeholder="e.g. medium natural hair" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Desired finish
          <select value={fields.finish} onChange={set("finish")} className={input}>
            {FINISHES.map((f) => (
              <option key={f} value={f}>{f === "" ? "—" : f}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Details to avoid
          <textarea value={fields.avoidDetails} onChange={set("avoidDetails")} rows={2} className={input} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Sensitivities / product preferences
          <textarea value={fields.sensitivities} onChange={set("sensitivities")} rows={2} className={input} placeholder="Allergies, products to use or avoid…" />
        </label>
      </div>
      <div className="grid gap-1 text-sm font-medium">
        Other notes
        <textarea value={fields.productPreferences} onChange={set("productPreferences")} rows={2} className={input} />
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Gallery inspiration (tap to toggle)</h3>
        <div className="flex flex-wrap gap-2">
          {gallery.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setPicked((p) => (p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id]))}
              className={`rounded-full px-3 py-1 text-xs ${picked.includes(g.id) ? "bg-ink text-cream" : "bg-black/10"}`}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid max-w-sm gap-2">
        <h3 className="text-sm font-semibold">Your photos (JPEG/PNG/WebP, max 5MB)</h3>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => addFiles(e.target.files)} className="text-sm" />
        {uploads.map((u) => (
          <p key={u.url} className="text-xs text-muted">✓ {u.label}</p>
        ))}
      </div>

      <div className="rounded-lg bg-card p-4 shadow-card">
        <h3 className="text-sm font-semibold">Inspiration board preview ({board.length})</h3>
        {board.length === 0 ? (
          <p className="text-xs text-muted">Pick gallery looks or upload photos to build your board.</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm">
            {board.map((b, i) => (
              <li key={`${b.galleryItemId ?? b.url}-${i}`}>
                {b.source === "gallery" ? `Gallery: ${b.label}` : `Upload: ${b.label}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : lookId ? "Save changes" : "Save look"}</Button>
      </div>
      <p className="text-xs text-muted">
        Draft board only — editing here never changes an agreed booking plan. Inspiration photos
        guide discussion and do not guarantee an identical result.
      </p>
    </div>
  );
}
