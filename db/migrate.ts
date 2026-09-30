import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("migrations applied");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
