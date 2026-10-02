// Copies leftover local uploads (public/uploads/*) into the R2 bucket as
// private objects. Prints old path -> stored ref for each file.
// Usage: npm run storage:backfill (requires R2 credentials + STORAGE_BACKEND=r2)
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

async function main() {
  const dir = join(process.cwd(), "public", "uploads");
  const files = (await readdir(dir)).filter((f) => f !== ".gitkeep");
  if (files.length === 0) {
    console.log("nothing to backfill");
    return;
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
    }
  });
  for (const f of files) {
    const key = `private/${f}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: await readFile(join(dir, f))
      })
    );
    console.log(`/uploads/${f} -> r2:${key}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
