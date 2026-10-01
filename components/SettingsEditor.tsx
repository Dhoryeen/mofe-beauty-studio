"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

export function SettingsEditor({ initial }: { initial: { key: string; value: string }[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((r) => [r.key, r.value]))
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(key: string) {
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: values[key] ?? "" })
    });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Saved ${key}.` : (data.error ?? "Save failed"));
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid gap-3">
      {msg && <p className="text-sm text-muted">{msg}</p>}
      {initial.map((r) => (
        <div key={r.key} className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
          <label className="grid gap-1 text-sm font-medium">
            <span className="font-mono text-xs text-muted">{r.key}</span>
            {r.key === "complex_look_guidance" ? (
              <textarea
                value={values[r.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm"
              />
            ) : (
              <TextInput value={values[r.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))} />
            )}
          </label>
          <div><Button variant="secondary" disabled={busy} onClick={() => save(r.key)}>Save</Button></div>
        </div>
      ))}
    </div>
  );
}
