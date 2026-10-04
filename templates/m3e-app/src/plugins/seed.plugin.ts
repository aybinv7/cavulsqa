import { ensureReferenceData } from "@/domains/sales/sales.repository";
import { rdb } from "@/shared/database";

/** Runs on every start: `ensureReferenceData` is idempotent and does nothing after the first. */
export async function seedPlugin(): Promise<void> {
  await ensureReferenceData(rdb);
}
