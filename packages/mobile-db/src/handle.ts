import type { Kysely } from "kysely";
import type { WriteContext } from "./write.js";

/**
 * What an app holds instead of a bare Kysely instance: the query builder, the write wrapper that
 * announces which tables changed, and a way to close.
 *
 * Nothing here is specific to how SQLite is reached, which is why it lives outside the Capacitor
 * module - an app on the OPFS engine needs this type and must not need the native plugin to get it.
 * `getRawConnection` is the one runtime-specific member, so it is typed loosely and throws on an
 * engine that has no native connection to hand back.
 */
export interface MobileDatabase<DB> {
  db: Kysely<DB>;
  write<T>(ctx: WriteContext, work: (trx: Kysely<DB>) => Promise<T>): Promise<T>;
  getRawConnection(): unknown;
  close(): Promise<void>;
}
