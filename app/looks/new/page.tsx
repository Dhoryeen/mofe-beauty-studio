import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { galleryItems } from "@/db/schema";
import { LookForm } from "@/components/LookForm";

export const dynamic = "force-dynamic";

export default async function NewLookPage({
  searchParams
}: {
  searchParams: { gallery?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const gallery = await db
    .select({ id: galleryItems.id, title: galleryItems.title })
    .from(galleryItems)
    .where(eq(galleryItems.active, true))
    .orderBy(asc(galleryItems.sortOrder));

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">New look</h1>
      <LookForm gallery={gallery} preselected={searchParams.gallery ?? null} />
    </div>
  );
}
