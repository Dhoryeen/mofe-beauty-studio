import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const base = "rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-ink text-cream hover:opacity-90"
      : variant === "secondary"
        ? "border border-ink/20 bg-card hover:bg-cream"
        : "bg-danger text-white hover:opacity-90";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}
