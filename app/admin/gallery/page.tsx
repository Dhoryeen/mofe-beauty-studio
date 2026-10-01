import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminGallery } from "@/components/AdminGallery";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") redirect("/sign-in");

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Gallery content</h1>
        <p className="text-sm text-muted">
          Publish studio portfolio photos with their tags. Only published looks appear in the public gallery.
        </p>
      </div>
      <AdminGallery />
    </div>
  );
}
