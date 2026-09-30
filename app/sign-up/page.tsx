"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signUp.email({ name, email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Sign-up failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-sm gap-4">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="text-sm text-muted">New accounts join as clients.</p>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Name
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Password
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
      </form>
      <p className="text-sm text-muted">
        Have an account? <a href="/sign-in" className="underline">Sign in</a>
      </p>
    </div>
  );
}
