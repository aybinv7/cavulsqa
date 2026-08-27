/**
 * A fair, non-reentrant async lock: waiters resume in arrival order, so writes keep the order they
 * were issued in rather than the order the event loop happens to resume.
 *
 * Both engines need exactly this. One SQLite connection cannot serve two writers, and a write
 * issued outside an explicit transaction asks the driver to open one - so two writes in the same
 * tick race for the BEGIN. Kysely holds a connection for the whole of a transaction, so taking the
 * lock in `acquireConnection` makes a statement or a transaction the unit of exclusion.
 */
export class ConnectionLock {
  #waiting: (() => void)[] = [];
  #held = false;

  async acquire(): Promise<void> {
    if (!this.#held) {
      this.#held = true;
      return;
    }
    await new Promise<void>((resolve) => {
      this.#waiting.push(resolve);
    });
  }

  release(): void {
    const next = this.#waiting.shift();
    if (next) next();
    else this.#held = false;
  }
}
