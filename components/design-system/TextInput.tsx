import type { InputHTMLAttributes } from "react";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-ink/20 bg-card px-3 py-2 text-sm placeholder:text-muted/70 ${props.className ?? ""}`}
    />
  );
}
