"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/design-system/Button";
import { TextInput } from "@/components/design-system/TextInput";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Sign-in failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-sm gap-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Email
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Password
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="text-sm text-muted">
        New here? <a href="/sign-up" className="underline">Create an account</a>
      </p>
    </div>
  );
}
