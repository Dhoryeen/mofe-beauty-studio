import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { GroupCreate } from "@/components/GroupViews";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">New group request</h1>
      <p className="text-sm text-muted">The studio confirms staffing, timing and pricing before anything is payable.</p>
      <GroupCreate />
    </div>
  );
}
