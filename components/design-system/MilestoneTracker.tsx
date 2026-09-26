const STEPS = [
  "Request received",
  "Consultation",
  "Awaiting approval",
  "Approved",
  "Confirmed",
  "In preparation",
  "Ready",
  "Completed"
];

export function MilestoneTracker({ current = 4 }: { current?: number }) {
  return (
    <ol className="grid gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-3 text-sm">
          <span
            aria-hidden
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              i < current ? "bg-moss text-white" : i === current ? "bg-gold text-white" : "bg-black/10"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === current ? "font-semibold" : i < current ? "" : "text-muted"}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
