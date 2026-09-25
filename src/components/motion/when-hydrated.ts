/**
 * React keeps every element it has hydrated, or created, under an own `__reactFiber$…` key. An
 * attribute written on a server-rendered element before that is one the server's HTML didn't have,
 * and React (in development) reports the whole tree as a hydration mismatch. A page that streams in
 * behind a loading.tsx hydrates after the layout's effects have run, so its pictures can finish
 * loading before React reaches them: My dates' cards did, every time.
 */
export const isHydrated = (el: object): boolean => Object.keys(el).some((key) => key.startsWith("__reactFiber$"));

type Scheduler = {
  frame: (callback: () => void) => number;
  cancel: (id: number) => void;
  now: () => number;
  /** How long an element waits for React before its job runs anyway (content React never hydrates). */
  maxWait: number;
  /** Whenever nothing is left waiting. */
  settled: () => void;
};

/** Runs a job for an element once React has hydrated it: at once when it has, else checked each frame. */
export function whenHydrated({ frame, cancel, now, maxWait, settled }: Scheduler) {
  const waiting = new Map<object, { job: () => void; since: number }>();
  let id = 0;
  const flush = () => {
    id = 0;
    const at = now();
    for (const [el, { job, since }] of waiting) {
      if (!isHydrated(el) && at - since <= maxWait) continue;
      waiting.delete(el);
      job();
    }
    if (waiting.size > 0) id = frame(flush);
    else settled();
  };
  return {
    run(el: object, job: () => void) {
      if (isHydrated(el)) return job();
      waiting.set(el, { job, since: now() });
      if (!id) id = frame(flush);
    },
    get waiting() {
      return waiting.size;
    },
    stop() {
      if (id) cancel(id);
      id = 0;
      waiting.clear();
    },
  };
}
