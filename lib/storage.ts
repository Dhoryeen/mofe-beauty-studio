import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { GetObjectCommand, PutObjectCommand, S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type Visibility = "public" | "private";
export type Backend = "local" | "r2";

export function backend(): Backend {
  if (
    process.env.STORAGE_BACKEND === "r2" &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  ) {
    return "r2";
  }
  return "local";
}

let s3: S3Client | null = null;
function r2(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    });
  }
  return s3;
}

function bucket() {
  return process.env.R2_BUCKET!;
}

// Stored references:
// - local: "/uploads/<file>" (served by Next from public/)
// - r2:    "r2:public/<key>" | "r2:private/<key>"
export async function putFile(bytes: Buffer, ext: string, visibility: Visibility): Promise<{ url: string; displayUrl: string }> {
  const name = `${randomUUID()}${ext}`;
  if (backend() === "r2") {
    const key = `${visibility}/${name}`;
    await r2().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: bytes, ContentType: contentType(ext) }));
    const url = `r2:${key}`;
    return { url, displayUrl: (await resolveUrl(url)) ?? url };
  }
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  const url = `/uploads/${name}`;
  return { url, displayUrl: url };
}

// Reads must go through this so private files become short-lived signed URLs
// only after the caller's own access check. Public files use R2_PUBLIC_URL
// when set, otherwise a signed URL.
export async function resolveUrl(ref: string | null, expiresIn = 3600): Promise<string | null> {
  if (!ref) return null;
  if (!ref.startsWith("r2:")) return ref;
  const key = ref.slice(3);
  const isPublic = key.startsWith("public/");
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (isPublic && base) return `${base}/${key}`;
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn });
}

export async function deleteFile(ref: string): Promise<void> {
  if (ref.startsWith("r2:")) {
    await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: ref.slice(3) }));
    return;
  }
  if (ref.startsWith("/uploads/")) {
    await unlink(join(process.cwd(), "public", ref)).catch(() => {});
  }
}

function contentType(ext: string) {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
