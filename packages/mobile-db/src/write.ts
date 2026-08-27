/**
 * A table in the schema. Defaults to `string` so the schema stays optional, but passing it turns a
 * misspelt table in `tables` - which otherwise just means an event nobody receives - into an error.
 */
export type TableName<DB = Record<string, unknown>> = keyof DB & string;

export interface WriteContext<DB = Record<string, unknown>> {
  operation: string;
  tables: TableName<DB>[];
}

export interface WriteTelemetry<DB = Record<string, unknown>> {
  success?: (ctx: WriteContext<DB>) => void;
  failure?: (ctx: WriteContext<DB>, error: unknown) => void;
}

export interface WriteDeps<DB = Record<string, unknown>> {
  runInTransaction: <T>(work: () => Promise<T>) => Promise<T>;
  emitTableChange: (table: TableName<DB>) => void;
  telemetry?: WriteTelemetry<DB>;
}

export async function runWrite<T, DB = Record<string, unknown>>(
  ctx: WriteContext<DB>,
  work: () => Promise<T>,
  deps: WriteDeps<DB>,
): Promise<T> {
  try {
    const result = await deps.runInTransaction(work);
    for (const table of ctx.tables) {
      deps.emitTableChange(table);
    }
    deps.telemetry?.success?.(ctx);
    return result;
  } catch (error) {
    deps.telemetry?.failure?.(ctx, error);
    throw error;
  }
}
