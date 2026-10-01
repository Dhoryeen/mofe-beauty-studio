import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { settings } from "@/db/schema";
import { SettingsEditor } from "@/components/SettingsEditor";

export const dynamic = "force-dynamic";

const EDITABLE = new Set([
  "deposit_pct",
  "quote_validity_days",
  "consultation_fee",
  "consultation_duration_min",
  "trial_fee",
  "complex_look_guidance",
  "free_reschedules_standard",
  "free_reschedule_notice_hours"
]);

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
  const editable = rows.filter((r) => EDITABLE.has(r.key));
  const rest = rows.filter((r) => !EDITABLE.has(r.key));
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Studio settings</h1>
      <p className="text-sm text-muted">Business settings seeded from PRD §6. Editable values take effect immediately (fees, validity, guidance).</p>
      <SettingsEditor initial={editable} />
      <table className="w-full overflow-hidden rounded-lg bg-card text-sm shadow-card">
        <tbody>
          {rest.map((r) => (
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
