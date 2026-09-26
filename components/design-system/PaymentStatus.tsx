export function PaymentStatus({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-ink px-3 py-1 text-xs font-medium text-cream">
      {status}
    </span>
  );
}
