import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// HTTP queries do not keep sockets alive in suspended serverless instances.
// Static builds must never connect to, or migrate, a database.
function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  return drizzle(neon(url), { schema });
}
export type Db = ReturnType<typeof create>;
let instance: Db | undefined;
export const db: Db = new Proxy({} as Db, {
  get(_, key) {
    instance ??= create();
    const value = Reflect.get(instance, key);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
export { schema };
