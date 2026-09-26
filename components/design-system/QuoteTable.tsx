export type QuoteLine = { label: string; amount: string };

export function QuoteTable({ lines, total }: { lines: QuoteLine[]; total: string }) {
  return (
    <table className="w-full overflow-hidden rounded-lg bg-card text-sm shadow-card">
      <tbody>
        {lines.map((l) => (
          <tr key={l.label} className="border-b border-black/5 last:border-0">
            <td className="px-4 py-2 text-muted">{l.label}</td>
            <td className="px-4 py-2 text-right font-medium">{l.amount}</td>
          </tr>
        ))}
        <tr className="bg-cream">
          <td className="px-4 py-2 font-semibold">Total payable</td>
          <td className="px-4 py-2 text-right font-semibold">{total}</td>
        </tr>
      </tbody>
    </table>
  );
}
