/**
 * Minimal concurrency limiter — avoids ESM-only p-limit.
 * Queues work so at most `concurrency` tasks run simultaneously.
 */
export function createLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  function next() {
    if (queue.length > 0 && running < concurrency) {
      queue.shift()!();
    }
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        running++;
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          running--;
          next();
        }
      };

      if (running < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}
