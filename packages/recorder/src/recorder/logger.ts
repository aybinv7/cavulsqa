/**
 * Where the recorder reports its own failures (a track that refused to start, a sink that threw).
 * The package never writes to `console` itself; route this to the app's error service.
 */
export interface RecorderLogger {
  info: (message: string, ...details: unknown[]) => void;
  warn: (message: string, ...details: unknown[]) => void;
}

export const silentLogger: RecorderLogger = {
  info: () => {},
  warn: () => {},
};
