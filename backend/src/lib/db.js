import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.js";

export function getDb(env) {
  return drizzle(env.DB, { schema });
}
