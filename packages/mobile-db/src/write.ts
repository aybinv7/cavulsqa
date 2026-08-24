export interface WriteContext {
  operation: string;
  tables: string[];
}

export interface WriteTelemetry {
  success?: (ctx: WriteContext) => void;
  failure?: (ctx: WriteContext, error: unknown) => void;
}

export interface WriteDeps {
  runInTransaction: <T>(work: () => Promise<T>) => Promise<T>;
  emitTableChange: (table: string) => void;
  telemetry?: WriteTelemetry;
}

export async function runWrite<T>(
  ctx: WriteContext,
  work: () => Promise<T>,
  deps: WriteDeps,
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
