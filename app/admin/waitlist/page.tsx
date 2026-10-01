import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { WaitlistAdmin } from "@/components/WaitlistAdmin";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") redirect("/sign-in");

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Waitlist</h1>
      <WaitlistAdmin />
    </div>
  );
}
