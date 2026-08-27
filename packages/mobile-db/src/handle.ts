import type { Kysely } from "kysely";
import type { WriteContext } from "./write.js";

export interface MobileDatabase<DB> {
  db: Kysely<DB>;
  write<T>(ctx: WriteContext<DB>, work: (trx: Kysely<DB>) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
