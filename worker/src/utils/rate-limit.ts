import { config } from "../config.js";
import { sleep } from "./sleep.js";

let queue = Promise.resolve();
let lastRunAt = 0;

export async function runSerialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const elapsed = Date.now() - lastRunAt;
    if (elapsed < config.delayMs) await sleep(config.delayMs - elapsed);
    try {
      return await task();
    } finally {
      lastRunAt = Date.now();
    }
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs = config.timeoutMs): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Collector timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
