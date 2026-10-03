import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  // Local dev ports plus the deployed origin (BETTER_AUTH_URL in production).
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3100",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])
  ],
  user: {
    additionalFields: {
      // client | manager | beautician_consultant. Not settable via the API.
      role: { type: "string", defaultValue: "client", input: false }
    }
  }
});
