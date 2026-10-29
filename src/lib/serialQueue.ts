/**
 * Runs async tasks one after another per key. Used so two quick stock clicks reach the server in the
 * order they were made (each save carries the absolute count, so an older save landing last would win).
 * A failing task rejects its own promise only; the next task in the same key still runs.
 */
export function createSerialQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const result = (tails.get(key) ?? Promise.resolve()).then(task, task);
    const tail = result.catch(() => undefined);
    tails.set(key, tail);
    void tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    return result;
  };
}
