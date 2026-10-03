import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  // Local dev runs on 3000 or 3100 — both are trusted origins.
  trustedOrigins: ["http://localhost:3000", "http://localhost:3100"],
  user: {
    additionalFields: {
      // client | manager | beautician_consultant. Not settable via the API.
      role: { type: "string", defaultValue: "client", input: false }
    }
  }
});
