export function ApprovalBanner({ state }: { state: "awaiting" | "approved" | "expired" }) {
  const copy =
    state === "awaiting"
      ? "Look and quote awaiting approval — preparation starts after you approve."
      : state === "approved"
        ? "Approved — this version is locked. Material changes need re-approval."
        : "Quote expired — studio review required before payment.";
  return (
    <div
      role="status"
      className={`rounded-md px-4 py-3 text-sm ${state === "expired" ? "bg-danger/10" : "bg-blush"}`}
    >
      {copy}
    </div>
  );
}
