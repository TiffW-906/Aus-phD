import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Check the D1 binding in vite.config.ts and the D1_DATABASE_ID used at build time."
    );
  }

  return drizzle(env.DB, { schema });
}
