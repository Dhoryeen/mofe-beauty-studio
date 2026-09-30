import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      // client | manager | beautician_consultant. Not settable via the API.
      role: { type: "string", defaultValue: "client", input: false }
    }
  }
});
