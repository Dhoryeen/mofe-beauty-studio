import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold">Studio settings</h1>
        <p className="text-sm text-danger">Access denied — managers only. Sign in as the studio manager.</p>
      </div>
    );
  }

  const rows = await db.select().from(settings);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Studio settings</h1>
      <p className="text-sm text-muted">Business settings seeded from PRD §6 (read-only in this phase).</p>
      <table className="w-full overflow-hidden rounded-lg bg-card text-sm shadow-card">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-2 font-mono text-muted">{r.key}</td>
              <td className="px-4 py-2 text-right font-medium">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
