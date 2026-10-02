import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { putFile } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Only JPEG, PNG or WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Max 5MB" }, { status: 400 });

  // Gallery publishes are public (consented studio content); everything else is private.
  const visibility = form.get("visibility") === "public" ? "public" : "private";
  if (visibility === "public") {
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  const { url, displayUrl } = await putFile(Buffer.from(await file.arrayBuffer()), ext, visibility);
  return NextResponse.json({ url, displayUrl });
}
