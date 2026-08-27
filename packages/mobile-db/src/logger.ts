export interface MobileDbLogger {
  info: (message: string, ...details: unknown[]) => void;
  warn: (message: string, ...details: unknown[]) => void;
}

/** The default. Pass your own to route a failed open to wherever the app's other failures go. */
export const consoleLogger: MobileDbLogger = {
  info: (message, ...details) => console.log(message, ...details),
  warn: (message, ...details) => console.warn(message, ...details),
};
