import { ensureReferenceData } from "@/domains/sales/sales.repository";
import { rdb } from "@/shared/database";

/**
 * Reference data the app cannot work without: the product catalogue, the tags, a few customers.
 *
 * A template has to be usable the moment it opens. Without this, the first thing a new install asks
 * you to do is press "seed sample data" before the New order sheet has anything to pick from - the
 * schema is there and every screen is empty, which reads as broken rather than as new.
 *
 * `ensureReferenceData` is idempotent, so this runs on every start and does nothing after the first.
 * Replace it with your own once the app has real data to load; delete it if data arrives from a
 * server. Demo orders stay behind the button - those are a demo, this is a working state.
 */
export async function seedPlugin(): Promise<void> {
  await ensureReferenceData(rdb);
}
