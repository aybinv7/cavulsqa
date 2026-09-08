export class TransactionBarrier {
  #idle: Promise<void> | null = null;
  #release: (() => void) | null = null;

  begin(): void {
    this.#idle ??= new Promise<void>((resolve) => {
      this.#release = resolve;
    });
  }

  end(): void {
    this.#release?.();
    this.#release = null;
    this.#idle = null;
  }

  waitForIdle(): Promise<void> | null {
    return this.#idle;
  }
}
